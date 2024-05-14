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

def map_terrain(terrain_directory):
    terrain_data = {}
    for root, dirs, files in os.walk(terrain_directory):
        relative_path = os.path.relpath(root, terrain_directory)
        if "textures" in relative_path:
            continue
        files_list = [f for f in files if os.path.isfile(os.path.join(root, f))]
        if files_list:
            terrain_data[relative_path.replace(os.path.sep, "/")] = files_list
    return terrain_data

def write_json(data, output_file):
    with open(output_file, 'w') as json_file:
        json.dump(data, json_file, indent=4)

if __name__ == "__main__":
    collision_directory = "./docs/assets/collision"
    placement_directory = "./docs/assets/placement"
    terrain_directory = "./docs/assets/terrain/"
    player_directory = "./docs/assets/player/"
    output_file_path = "./docs/assets/collisionHierarchy.json"

    data = {}
    data["collision"] = traverse_directory(collision_directory)
    data["placement"] = get_files_in_directory(placement_directory)
    data["terrain"] = map_terrain(terrain_directory)
    data["player"] = map_terrain(player_directory)

    write_json(data, output_file_path)

    print("JSON file has been created successfully!")
