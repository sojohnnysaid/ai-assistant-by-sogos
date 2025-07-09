import json
import os
from typing import Dict, List, Optional, Any
from pathlib import Path
import importlib
import inspect
from datetime import datetime

from src.tools.base_tool import BaseTool, ToolResult


class ToolManager:
    """Manages tool registration, execution, and configuration"""
    
    def __init__(self, config_path: str = "src/config/tools.json"):
        self.config_path = config_path
        self.tools: Dict[str, BaseTool] = {}
        self.config: Dict[str, Any] = {}
        self.execution_log: List[Dict[str, Any]] = []
        self._load_configuration()
        self._load_tools()
    
    def _load_configuration(self):
        """Load tool configuration from JSON file"""
        try:
            with open(self.config_path, 'r') as f:
                self.config = json.load(f)
        except Exception as e:
            print(f"Error loading tool configuration: {e}")
            self.config = {"tools": [], "settings": {}}
    
    def _load_tools(self):
        """Dynamically load and register all tools"""
        tools_dir = Path("src/tools")
        if not tools_dir.exists():
            return
        
        # Load each tool module
        for file_path in tools_dir.glob("*.py"):
            if file_path.name.startswith("_") or file_path.name == "base_tool.py":
                continue
            
            module_name = file_path.stem
            try:
                # Import the module
                module = importlib.import_module(f"src.tools.{module_name}")
                
                # Find tool classes in the module
                for name, obj in inspect.getmembers(module):
                    if (inspect.isclass(obj) and 
                        issubclass(obj, BaseTool) and 
                        obj != BaseTool):
                        # Find matching configuration
                        tool_config = self._find_tool_config(obj)
                        if tool_config and tool_config.get("enabled", True):
                            tool_instance = obj(tool_config)
                            self.tools[tool_instance.id] = tool_instance
                            print(f"Loaded tool: {tool_instance.name}")
            except Exception as e:
                print(f"Error loading tool module {module_name}: {e}")
    
    def _find_tool_config(self, tool_class) -> Optional[Dict[str, Any]]:
        """Find configuration for a tool class"""
        # Try to match by class name or tool_id attribute
        class_name = tool_class.__name__
        tool_id = getattr(tool_class, "tool_id", None) or class_name.lower()
        
        for tool_config in self.config.get("tools", []):
            if tool_config.get("id") == tool_id:
                return tool_config
        
        return None
    
    async def execute_tool(self, tool_id: str, parameters: Dict[str, Any], 
                          user_confirmed: bool = False) -> ToolResult:
        """Execute a tool with given parameters"""
        if not self.is_enabled():
            return ToolResult(False, error="Tools are disabled in configuration")
        
        tool = self.tools.get(tool_id)
        if not tool:
            return ToolResult(False, error=f"Tool '{tool_id}' not found")
        
        if not tool.enabled:
            return ToolResult(False, error=f"Tool '{tool_id}' is disabled")
        
        # Validate parameters
        validation_error = tool.validate_parameters(parameters)
        if validation_error:
            return ToolResult(False, error=validation_error)
        
        # Check confirmation requirement
        if tool.requires_confirmation() and not user_confirmed:
            return ToolResult(
                False, 
                error="Tool requires user confirmation",
                data={"requires_confirmation": True}
            )
        
        # Execute the tool
        try:
            result = await tool.execute(parameters)
            
            # Log execution
            self._log_execution(tool_id, parameters, result)
            
            return result
        except Exception as e:
            error_result = ToolResult(False, error=str(e))
            self._log_execution(tool_id, parameters, error_result)
            return error_result
    
    def _log_execution(self, tool_id: str, parameters: Dict[str, Any], 
                      result: ToolResult):
        """Log tool execution for auditing"""
        if self.config.get("settings", {}).get("log_tool_usage", True):
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "tool_id": tool_id,
                "parameters": parameters,
                "result": result.to_dict()
            }
            self.execution_log.append(log_entry)
    
    def get_available_tools(self) -> List[Dict[str, Any]]:
        """Get list of available tools and their descriptions"""
        return [
            {
                "id": tool.id,
                "name": tool.name,
                "description": tool.description,
                "category": tool.category,
                "enabled": tool.enabled
            }
            for tool in self.tools.values()
            if tool.enabled
        ]
    
    def get_tools_for_ai(self) -> List[Dict[str, Any]]:
        """Get tool descriptions formatted for AI model"""
        return [
            tool.to_ai_description()
            for tool in self.tools.values()
            if tool.enabled
        ]
    
    def is_enabled(self) -> bool:
        """Check if tools are enabled globally"""
        return self.config.get("settings", {}).get("enable_tools", True)
    
    def get_ai_instructions(self) -> Dict[str, Any]:
        """Get AI instructions for tool usage"""
        return self.config.get("ai_instructions", {})