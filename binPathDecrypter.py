import json

def read_words_from_binary(file_path, offset):
    words = []
    with open(file_path, 'rb') as file:
        file.seek(offset)
        data = file.read()
        word = ''
        for byte in data:
            if byte == 0:
                if word:
                    words.append(word)
                    word = ''
            else:
                word += chr(byte)
        if word:
            words.append(word)
    return words

def remove_second_to_last_segment(path):
    segments = path.split('/')
    if len(segments) >= 3:
        del segments[-2]
    return '/'.join(segments)

def group_words(array):

  current_group = []
  output = {}

  for word in array:
    if word.startswith('object/'):
      for _wrd in current_group:
        output[_wrd] = remove_second_to_last_segment(word)
      current_group = []
    else:
      current_group.append(word)

    with open("object_mappings.json", 'w') as json_file:
        json.dump(output, json_file, indent=4)

# Example usage:
file_path = './placement_binaries/Common.bin'
offset = 42048
words = read_words_from_binary(file_path, offset)
print(group_words(words))
