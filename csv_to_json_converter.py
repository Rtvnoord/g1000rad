import csv
import json

def csv_to_json(csv_file_path, json_file_path):
    encodings = ['utf-8-sig', 'cp1252', 'latin-1']
    data = {}

    for encoding in encodings:
        try:
            with open(csv_file_path, 'r', encoding=encoding) as csv_file:
                csv_reader = csv.reader(csv_file)
                for index, row in enumerate(csv_reader, start=1):
                    if len(row) >= 2:
                        data[str(index)] = {"artist": row[0], "song": row[1]}
            print(f"Bestand succesvol gelezen met encoding: {encoding}")
            break
        except UnicodeDecodeError:
            print(f"Kon het bestand niet lezen met encoding: {encoding}")
            if encoding == encodings[-1]:
                print("Kon het bestand niet lezen met de beschikbare encodings.")
                return

    with open(json_file_path, 'w', encoding='utf-8') as json_file:
        json.dump(data, json_file, ensure_ascii=False, indent=2)

# Voer de conversie uit
csv_to_json('liedjes.csv', 'wheelData.json')
print("Conversie voltooid. Check wheelData.json voor het resultaat.")
