#!/usr/bin/env python3
"""
Script to switch between original and new UI designs
"""
import os
import shutil
from datetime import datetime


def switch_to_new_ui():
    """Switch to the new UI design"""
    # Backup current index.html
    if os.path.exists("templates/index.html"):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"templates/index_original_{timestamp}.html"
        shutil.copy2("templates/index.html", backup_name)
        print(f"✓ Backed up original UI to: {backup_name}")
    
    # Copy new UI
    if os.path.exists("templates/index_new.html"):
        shutil.copy2("templates/index_new.html", "templates/index.html")
        print("✓ Switched to new UI design")
        print("\nNew UI features:")
        print("- Central sphere animation area")
        print("- Side panels with stats and agent info")
        print("- Dark technical aesthetic with cyan accents")
        print("- Monospace typography with glow effects")
        return True
    else:
        print("✗ New UI file not found")
        return False


def switch_to_original_ui():
    """Switch back to original UI design"""
    # Find most recent backup
    backups = [f for f in os.listdir("templates") if f.startswith("index_original_")]
    if backups:
        backups.sort()
        latest_backup = backups[-1]
        shutil.copy2(f"templates/{latest_backup}", "templates/index.html")
        print(f"✓ Restored original UI from: {latest_backup}")
        return True
    else:
        print("✗ No original UI backup found")
        return False


def main():
    """Main function"""
    print("UI Switcher")
    print("-" * 40)
    print("1. Switch to NEW UI (technical/dashboard style)")
    print("2. Switch to ORIGINAL UI")
    print("3. Exit")
    
    choice = input("\nSelect option (1-3): ").strip()
    
    if choice == "1":
        switch_to_new_ui()
    elif choice == "2":
        switch_to_original_ui()
    elif choice == "3":
        print("Exiting...")
    else:
        print("Invalid choice")


if __name__ == "__main__":
    main()