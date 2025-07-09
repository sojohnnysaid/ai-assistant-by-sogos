import os
import asyncio
from typing import Dict, Any, Optional
from .base_tool import BaseTool, ToolResult


class DocumentTool(BaseTool):
    """Tool for creating documents on the user's desktop"""
    
    tool_id = "create_document"  # Class attribute for tool manager to find
    
    def _parse_filename(self, filename: str) -> tuple[str, str]:
        """Parse filename to extract name and extension."""
        if '.' in filename:
            # User provided extension
            return filename, ""
        else:
            # No extension provided, default to .md
            return filename + ".md", ".md"
    
    async def execute(self, parameters: Dict[str, Any]) -> ToolResult:
        """
        Create a new document with the specified content.
        
        Parameters expected:
            filename: The name of the file to create (with or without extension)
            content: The content to write to the file
            extension: Optional extension override (e.g., '.txt', '.json', '.md')
        """
        try:
            filename = parameters.get("filename", "")
            content = parameters.get("content", "")
            extension = parameters.get("extension")
            
            # Handle extension
            if extension:
                # Ensure extension starts with dot
                if not extension.startswith('.'):
                    extension = '.' + extension
                # Remove any existing extension from filename
                base_name = filename.rsplit('.', 1)[0] if '.' in filename else filename
                full_filename = base_name + extension
            else:
                full_filename, _ = self._parse_filename(filename)
            
            # Create the file on Desktop
            desktop_path = os.path.expanduser("~/Desktop")
            file_path = os.path.join(desktop_path, full_filename)
            
            # Write the file
            with open(file_path, 'w') as f:
                f.write(content)
            
            return ToolResult(
                success=True,
                data={
                    "message": f"Document created successfully: {full_filename}",
                    "file_path": file_path
                }
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e)
            )
    
    def get_parameters(self) -> Dict[str, Any]:
        """Return the parameters schema for this tool."""
        # Override the base class parameters with our custom schema
        return {
            "filename": {
                "type": "string",
                "description": "The name of the file to create (e.g., 'todos', 'notes.txt', 'data.json')",
                "required": True
            },
            "content": {
                "type": "string", 
                "description": "The content to write to the file",
                "required": True
            },
            "extension": {
                "type": "string",
                "description": "Optional file extension (e.g., '.txt', '.json', '.md'). Defaults to .md if not specified",
                "required": False
            }
        }