import os
import zipfile
import shutil

EXCLUDE_DIRS = {
    'node_modules',
    '.git',
    'dist',
    '.turbo',
    '.next',
    '__pycache__'
}

EXCLUDE_EXTS = {
    '.zip',
    '.pyc'
}

EXCLUDE_FILES = {
    'package_project.py'
}

def create_zip():
    base_dir = os.path.abspath(os.path.dirname(__file__))
    zip_filename = "the-commissary-project.zip"
    zip_path = os.path.join(base_dir, zip_filename)
    public_dir = os.path.join(base_dir, "public")
    os.makedirs(public_dir, exist_ok=True)
    public_zip_path = os.path.join(public_dir, zip_filename)

    print(f"Creating ZIP archive at {zip_path}...")
    file_count = 0
    total_uncompressed_bytes = 0

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(base_dir):
            # Modify dirs in-place to avoid walking into excluded dirs
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.')]

            for file in files:
                if file in EXCLUDE_FILES or file == zip_filename:
                    continue
                _, ext = os.path.splitext(file)
                if ext.lower() in EXCLUDE_EXTS:
                    continue

                abs_file = os.path.join(root, file)
                rel_file = os.path.relpath(abs_file, base_dir)

                # Avoid putting public/the-commissary-project.zip into the archive
                if rel_file.endswith('.zip'):
                    continue

                zipf.write(abs_file, rel_file)
                file_count += 1
                total_uncompressed_bytes += os.path.getsize(abs_file)
                print(f"  + Added: {rel_file}")

    # Copy to public folder as well
    shutil.copy2(zip_path, public_zip_path)
    zip_size = os.path.getsize(zip_path)

    print(f"\nSuccessfully created {zip_filename}!")
    print(f"Total files packed: {file_count}")
    print(f"Uncompressed size: {total_uncompressed_bytes / 1024:.2f} KB")
    print(f"ZIP Archive size: {zip_size / 1024:.2f} KB")
    print(f"Public mirror saved to: {public_zip_path}")

if __name__ == "__main__":
    create_zip()
