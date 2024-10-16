import csv
import json

def csv_to_json(csv_file_path, json_file_path):
    data = {}
    with open(csv_file_path, 'r', encoding='utf-8') as csv_file:
        csv_reader = csv.reader(csv_file)
        for index, row in enumerate(csv_reader, start=1):
            if len(row) >= 2:
                data[str(index)] = {"artist": row[0], "song": row[1]}
    
    with open(json_file_path, 'w', encoding='utf-8') as json_file:
        json.dump(data, json_file, ensure_ascii=False, indent=2)

# Voer de conversie uit
csv_to_json('liedjes.csv', 'wheelData.json')
print("Conversie voltooid. Check wheelData.json voor het resultaat.")
