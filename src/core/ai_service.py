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
        self.model = "gemini-2.5-flash"
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
        """Build system instruction"""
        base_instruction = "You are a helpful, concise voice assistant. Respond in 1-2 short sentences. Be conversational and natural."
        
        if self.tool_manager and self.tool_manager.is_enabled():
            ai_instructions = self.tool_manager.get_ai_instructions()
            tool_prompt = ai_instructions.get("system_prompt_addition", "")
            return base_instruction + "\n\n" + tool_prompt
        
        return base_instruction
    
    def _build_tool_declarations(self) -> Optional[List[types.Tool]]:
        """Build Gemini function declarations from available tools"""
        if not self.tool_manager or not self.tool_manager.is_enabled():
            return None
        
        tools_config = self.tool_manager.get_tools_for_ai()
        if not tools_config:
            return None
        
        function_declarations = []
        for tool in tools_config:
            # Convert tool config to Gemini function declaration format
            properties = {}
            required = []
            
            if 'parameters' in tool:
                for param_name, param_config in tool['parameters'].items():
                    properties[param_name] = {
                        "type": param_config.get('type', 'string'),
                        "description": param_config.get('description', '')
                    }
                    if param_config.get('required', False):
                        required.append(param_name)
            
            function_declarations.append({
                "name": tool.get('tool_id', tool.get('id')),  # Handle both 'tool_id' and 'id'
                "description": tool.get('description', ''),
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": required
                }
            })
        
        return [types.Tool(function_declarations=function_declarations)]
    
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
            tools = self._build_tool_declarations()
            generate_config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0),
                response_mime_type="text/plain",
                temperature=0.7,
                max_output_tokens=200,  # Increased for tool calls
                candidate_count=1,
                system_instruction=self._build_system_instruction(),
                tools=tools if tools else None,
            )
            
            # Generate response (not streaming to properly handle function calls)
            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=generate_config,
            )
            
            # Check for function calls in the response
            tool_call = None
            ai_response = ""
            
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'function_call') and part.function_call:
                        # Extract function call details
                        tool_call = {
                            "tool_id": part.function_call.name,
                            "parameters": dict(part.function_call.args) if part.function_call.args else {}
                        }
                    elif hasattr(part, 'text') and part.text:
                        ai_response += part.text
            
            if tool_call and self.tool_manager:
                # Execute the tool
                tool_result = await self.tool_manager.execute_tool(
                    tool_call.get("tool_id"),
                    tool_call.get("parameters", {}),
                    user_confirmed=tool_call.get("confirmed", False)
                )
                
                # If confirmation is required, return the AI's response asking for it
                if tool_result.data and tool_result.data.get("requires_confirmation"):
                    return {
                        "response": ai_response if ai_response else f"I can help you create that document. Please confirm you want me to save {tool_call.get('parameters', {}).get('filename', 'the file')} to your desktop.",
                        "success": True,
                        "tool_execution": {
                            "executed": False,
                            "requires_confirmation": True,
                            "tool_id": tool_call.get("tool_id"),
                            "parameters": tool_call.get("parameters", {})
                        }
                    }
                
                # If tool execution succeeded, send result back to model for user-friendly response
                if tool_result.success:
                    # Create function response part
                    function_response_part = types.Part.from_function_response(
                        name=tool_call.get("tool_id"),
                        response={"result": tool_result.data}
                    )
                    
                    # Append function call and result to contents
                    contents.append(response.candidates[0].content)
                    contents.append(types.Content(role="user", parts=[function_response_part]))
                    
                    # Get final response from model
                    final_response = self.client.models.generate_content(
                        model=self.model,
                        contents=contents,
                        config=generate_config,
                    )
                    
                    final_text = ""
                    if final_response.candidates and final_response.candidates[0].content.parts:
                        for part in final_response.candidates[0].content.parts:
                            if hasattr(part, 'text') and part.text:
                                final_text += part.text
                    
                    return {
                        "response": final_text if final_text else f"I've successfully {tool_result.data.get('message', 'completed the action')}",
                        "success": True,
                        "tool_execution": {
                            "executed": True,
                            "tool_id": tool_call.get("tool_id"),
                            "result": tool_result.to_dict()
                        }
                    }
                else:
                    # Tool execution failed
                    return {
                        "response": f"I couldn't complete that action: {tool_result.error}",
                        "success": True,
                        "tool_execution": {
                            "executed": False,
                            "tool_id": tool_call.get("tool_id"),
                            "error": tool_result.error
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