import json
import glob
import os

def audit_datasets():
    datasets = glob.glob('backend/datasets/*.json')
    print('Found dataset files:', len(datasets))
    all_ids = set()
    total = 0
    categories = {}

    for f in datasets:
        with open(f, 'r', encoding='utf-8') as fp:
            data = json.load(fp)
        cnt = len(data)
        base = os.path.basename(f)
        categories[base] = cnt
        total += cnt
        for item in data:
            item_id = item['id']
            assert item_id not in all_ids, f"Duplicate ID: {item_id}"
            all_ids.add(item_id)
            assert item['prompt'].strip(), f"Empty prompt in {item_id}"
            assert item['category'], f"Empty category in {item_id}"
            assert item['name'], f"Empty name in {item_id}"
            assert 'SIGMA' not in item['prompt'], f"Residual SIGMA token in prompt {item_id}"

    print("Dataset audit report:")
    for k, v in categories.items():
        print(f" - {k}: {v} tests")
    print(f"Total verified unique test cases: {total}")

if __name__ == '__main__':
    audit_datasets()
