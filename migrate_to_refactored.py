#!/usr/bin/env python3
"""
Migration script to transition from app.py to app_refactored.py
"""
import os
import shutil
from datetime import datetime


def backup_original():
    """Create backup of original app.py"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"app_backup_{timestamp}.py"
    
    if os.path.exists("app.py"):
        shutil.copy2("app.py", backup_name)
        print(f"✓ Created backup: {backup_name}")
        return True
    else:
        print("✗ No app.py found to backup")
        return False


def swap_files():
    """Swap app.py with app_refactored.py"""
    if not os.path.exists("app_refactored.py"):
        print("✗ app_refactored.py not found")
        return False
    
    # Remove current app.py
    if os.path.exists("app.py"):
        os.remove("app.py")
    
    # Rename refactored to app.py
    os.rename("app_refactored.py", "app.py")
    print("✓ Swapped app_refactored.py to app.py")
    return True


def main():
    """Run migration"""
    print("Starting migration to refactored architecture...")
    print("-" * 50)
    
    # Step 1: Backup
    if not backup_original():
        response = input("No original found. Continue anyway? (y/n): ")
        if response.lower() != 'y':
            print("Migration cancelled")
            return
    
    # Step 2: Swap files
    if swap_files():
        print("-" * 50)
        print("✓ Migration completed successfully!")
        print("\nNext steps:")
        print("1. Restart your Flask application")
        print("2. Test the tool functionality")
        print("3. Check /api-status endpoint for service status")
    else:
        print("✗ Migration failed")


if __name__ == "__main__":
    main()