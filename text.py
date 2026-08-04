import os

# Folders and files to ignore completely
IGNORED_DIRS = {
    'node_modules', '.expo', '.git', 'dist', 'build', 
    'ios', 'android', '.vscode', '__pycache__'
}

IGNORED_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', 
    '.lock', '.pdf', '.zip', '.tar', '.gz'
}

OUTPUT_FILE = 'codebase_summary.txt'

def bundle_codebase():
    current_dir = os.getcwd()
    print(f"Bundling codebase from: {current_dir}")
    
    file_count = 0

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk(current_dir):
            # Modify dirs in-place to prevent os.walk from entering ignored directories
            dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                
                # Skip binary or media files
                if ext in IGNORED_EXTENSIONS:
                    continue
                
                # Skip the output file itself if it's already in the directory
                if file == OUTPUT_FILE:
                    continue

                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, current_dir)

                try:
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                        # Write separator and file path header
                        outfile.write("=" * 80 + "\n")
                        outfile.write(f"FILE: {relative_path}\n")
                        outfile.write("=" * 80 + "\n\n")
                        
                        # Write file contents
                        outfile.write(content)
                        outfile.write("\n\n" + ("-" * 80) + "\n\n")
                        
                        file_count += 1
                        print(f"Added: {relative_path}")
                except Exception as e:
                    print(f"Skipped {relative_path} due to read error: {e}")

    print(f"\nSuccessfully bundled {file_count} files into '{OUTPUT_FILE}'!")

if __name__ == "__main__":
    bundle_codebase()