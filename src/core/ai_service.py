import os
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
import json
import re

from src.core.tool_manager import ToolManager


class AIService:
    """Service for handling AI interactions with tool support"""
    
    def __init__(self, api_key: str = None, tool_manager: Optional[ToolManager] = None):
        self.api_key = api_key or os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        self.client = None
        self.model = "gemini-2.0-flash-exp"
        self.tool_manager = tool_manager
        
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                print("Gemini client initialized successfully")
            except Exception as e:
                print(f"Error initializing Gemini client: {e}")
    
    def is_configured(self) -> bool:
        """Check if AI service is properly configured"""
        return self.client is not None
    
    def _build_system_instruction(self) -> str:
        """Build system instruction including tool usage instructions"""
        base_instruction = "You are a helpful, concise voice assistant. Respond in 1-2 short sentences. Be conversational and natural."
        
        if self.tool_manager and self.tool_manager.is_enabled():
            ai_instructions = self.tool_manager.get_ai_instructions()
            tool_prompt = ai_instructions.get("system_prompt_addition", "")
            
            # Add available tools to the instruction
            tools = self.tool_manager.get_tools_for_ai()
            if tools:
                tool_list = json.dumps(tools, indent=2)
                tool_instruction = f"\n\n{tool_prompt}\n\nAvailable tools:\n{tool_list}\n\nWhen you need to use a tool, respond with a JSON block in this format:\n```json\n{{\n  \"tool_call\": {{\n    \"tool_id\": \"tool_name\",\n    \"parameters\": {{\n      \"param1\": \"value1\"\n    }}\n  }}\n}}\n```"
                return base_instruction + tool_instruction
        
        return base_instruction
    
    def _extract_tool_call(self, response: str) -> Optional[Dict[str, Any]]:
        """Extract tool call from AI response"""
        # Look for JSON code blocks
        json_pattern = r'```json\s*({.*?})\s*```'
        matches = re.findall(json_pattern, response, re.DOTALL)
        
        for match in matches:
            try:
                data = json.loads(match)
                if "tool_call" in data:
                    return data["tool_call"]
            except json.JSONDecodeError:
                continue
        
        return None
    
    async def generate_response(self, 
                              message: str, 
                              history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """Generate AI response with potential tool usage"""
        if not self.is_configured():
            return {
                "response": f"I heard you say: '{message}'. However, the AI service is not configured.",
                "success": False,
                "error": "AI service not configured"
            }
        
        try:
            # Build conversation context
            contents = []
            
            # Add chat history
            if history:
                for msg in history:
                    role = 'model' if msg['role'] == 'assistant' else msg['role']
                    contents.append(types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=msg['content'])]
                    ))
            
            # Add current message
            contents.append(types.Content(
                role="user",
                parts=[types.Part.from_text(text=message)]
            ))
            
            # Generate response
            generate_config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0),
                response_mime_type="text/plain",
                temperature=0.7,
                max_output_tokens=200,  # Increased for tool calls
                candidate_count=1,
                system_instruction=self._build_system_instruction(),
            )
            
            # Collect response
            ai_response = ""
            for chunk in self.client.models.generate_content_stream(
                model=self.model,
                contents=contents,
                config=generate_config,
            ):
                if chunk.text:
                    ai_response += chunk.text
            
            # Check for tool calls
            tool_call = self._extract_tool_call(ai_response)
            
            if tool_call and self.tool_manager:
                # Execute the tool
                tool_result = await self.tool_manager.execute_tool(
                    tool_call.get("tool_id"),
                    tool_call.get("parameters", {}),
                    user_confirmed=tool_call.get("confirmed", False)
                )
                
                # Format response based on tool result
                if tool_result.success:
                    tool_message = tool_result.data.get("message", "Tool executed successfully")
                    final_response = f"I've {tool_message}"
                else:
                    if tool_result.data and tool_result.data.get("requires_confirmation"):
                        final_response = ai_response  # Keep original response asking for confirmation
                    else:
                        final_response = f"I couldn't complete that action: {tool_result.error}"
                
                return {
                    "response": final_response,
                    "success": True,
                    "tool_execution": {
                        "executed": True,
                        "tool_id": tool_call.get("tool_id"),
                        "result": tool_result.to_dict()
                    }
                }
            else:
                # No tool call, return normal response
                # Remove any JSON blocks from the response
                clean_response = re.sub(r'```json.*?```', '', ai_response, flags=re.DOTALL).strip()
                return {
                    "response": clean_response or ai_response,
                    "success": True
                }
            
        except Exception as e:
            print(f"AI generation error: {e}")
            return {
                "response": "I encountered an error processing your request.",
                "success": False,
                "error": str(e)
            }