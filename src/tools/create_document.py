import os
from pathlib import Path
from typing import Dict, Any
from datetime import datetime

from src.tools.base_tool import BaseTool, ToolResult


class CreateDocumentTool(BaseTool):
    """Tool for creating documents on the user's desktop"""
    
    tool_id = "create_document"
    
    async def execute(self, parameters: Dict[str, Any]) -> ToolResult:
        """Create a document with the specified content"""
        try:
            filename = parameters.get("filename")
            content = parameters.get("content", "")
            folder = parameters.get("folder", "")
            extension = parameters.get("extension", ".md")
            
            # Get desktop path
            desktop_path = Path.home() / "Desktop"
            
            # Create subdirectory if specified
            if folder:
                target_path = desktop_path / folder
                target_path.mkdir(parents=True, exist_ok=True)
            else:
                target_path = desktop_path
            
            # Handle extension
            if '.' not in filename:
                # Ensure extension starts with dot
                if extension and not extension.startswith('.'):
                    extension = '.' + extension
                filename = f"{filename}{extension}"
            
            # Full file path
            file_path = target_path / filename
            
            # Security check: ensure we're writing within allowed paths
            allowed_paths = self.permissions.get("allowed_paths", ["~/Desktop"])
            allowed = False
            for allowed_path in allowed_paths:
                allowed_path = Path(allowed_path).expanduser()
                try:
                    file_path.resolve().relative_to(allowed_path.resolve())
                    allowed = True
                    break
                except ValueError:
                    continue
            
            if not allowed:
                return ToolResult(
                    False, 
                    error=f"Cannot write to {file_path}. Only desktop paths are allowed."
                )
            
            # Check file size limit
            max_size = self.permissions.get("max_file_size", 1048576)
            if len(content.encode('utf-8')) > max_size:
                return ToolResult(
                    False,
                    error=f"Content exceeds maximum file size of {max_size} bytes"
                )
            
            # Write the file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Return success with file info
            return ToolResult(
                True,
                data={
                    "file_path": str(file_path),
                    "file_size": len(content.encode('utf-8')),
                    "created_at": datetime.now().isoformat(),
                    "message": f"Successfully created {file_path.name} at {file_path}"
                }
            )
            
        except Exception as e:
            return ToolResult(False, error=f"Failed to create document: {str(e)}")