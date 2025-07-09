from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import json
from datetime import datetime


class ToolResult:
    """Represents the result of a tool execution"""
    def __init__(self, success: bool, data: Any = None, error: str = None):
        self.success = success
        self.data = data
        self.error = error
        self.timestamp = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "timestamp": self.timestamp
        }


class BaseTool(ABC):
    """Abstract base class for all tools"""
    
    def __init__(self, tool_config: Dict[str, Any]):
        self.id = tool_config.get("id")
        self.name = tool_config.get("name")
        self.description = tool_config.get("description")
        self.category = tool_config.get("category")
        self.enabled = tool_config.get("enabled", True)
        self.parameters = tool_config.get("parameters", {})
        self.permissions = tool_config.get("permissions", {})
        self.ai_description = tool_config.get("ai_description", "")
    
    @abstractmethod
    async def execute(self, parameters: Dict[str, Any]) -> ToolResult:
        """Execute the tool with given parameters"""
        pass
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> Optional[str]:
        """Validate input parameters against tool configuration"""
        for param_name, param_config in self.parameters.items():
            if param_config.get("required", False) and param_name not in parameters:
                return f"Missing required parameter: {param_name}"
            
            if param_name in parameters:
                param_value = parameters[param_name]
                param_type = param_config.get("type")
                
                # Type validation
                if param_type == "string" and not isinstance(param_value, str):
                    return f"Parameter {param_name} must be a string"
                elif param_type == "number" and not isinstance(param_value, (int, float)):
                    return f"Parameter {param_name} must be a number"
                elif param_type == "boolean" and not isinstance(param_value, bool):
                    return f"Parameter {param_name} must be a boolean"
                
                # Additional validation rules
                validation = param_config.get("validation", {})
                if "pattern" in validation:
                    import re
                    if not re.match(validation["pattern"], str(param_value)):
                        return f"Parameter {param_name} does not match required pattern"
                
                if "max_length" in validation and len(str(param_value)) > validation["max_length"]:
                    return f"Parameter {param_name} exceeds maximum length"
        
        return None
    
    def requires_confirmation(self) -> bool:
        """Check if tool requires user confirmation"""
        return self.permissions.get("require_confirmation", True)
    
    def to_ai_description(self) -> Dict[str, Any]:
        """Get tool description formatted for AI model"""
        return {
            "tool_id": self.id,
            "name": self.name,
            "description": self.ai_description or self.description,
            "parameters": {
                name: {
                    "type": config["type"],
                    "description": config["description"],
                    "required": config.get("required", False)
                }
                for name, config in self.parameters.items()
            }
        }