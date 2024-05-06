import os
import json

def traverse_directory(root_dir):
    folder_structure = {}

    for root, dirs, files in os.walk(root_dir):

        current_dir = folder_structure
        folders = root.split(os.sep)[1:]

        for folder in folders:
            current_dir = current_dir.setdefault(folder, {})

        for file in files:
            if file.endswith('.obj'):
                current_dir[os.path.splitext(file)[0]] = file
    
    return folder_structure

def get_files_in_directory(directory):
    return [file for file in os.listdir(directory) if os.path.isfile(os.path.join(directory, file))]

def write_json(data, output_file):
    with open(output_file, 'w') as json_file:
        json.dump(data, json_file, indent=4)

if __name__ == "__main__":
    collision_directory = "./res/collision"
    placement_directory = "./res/placement"
    output_file_path = "collisionHierarchy.json"

    data = {}
    data["collision"] = traverse_directory(collision_directory)
    data["placement"] = get_files_in_directory(placement_directory)

    write_json(data, output_file_path)

    print("JSON file has been created successfully!")
