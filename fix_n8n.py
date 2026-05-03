import json

with open('Instaku Question Generation (3).json', 'r') as f:
    data = json.load(f)

nodes = data['nodes']
connections = data['connections']

# 1. Fix Loop Over Questions connections
if 'Loop Over Questions' in connections:
    loop_conns = connections['Loop Over Questions']['main']
    # Swap index 0 and index 1
    if len(loop_conns) == 2:
        # Expected: index 0 (loop) -> Initialize Variables, index 1 (done) -> Update Job Completed
        # Currently they are reversed. Let's explicitly set them.
        connections['Loop Over Questions']['main'] = [
            [{"node": "Initialize Variables", "type": "main", "index": 0}], # index 0 = loop
            [{"node": "Update Job Completed", "type": "main", "index": 0}]  # index 1 = done
        ]

# 2. Fix data references in Insert Question to DB and Update Question Passed
for node in nodes:
    if node['name'] == 'Insert Question to DB':
        # Replace $json.userId with Webhook Trigger reference to be completely bulletproof
        body = node['parameters'].get('jsonBody', '')
        if '$json.userId' in body:
            body = body.replace('$json.userId', "$('Webhook Trigger').first().json.body.userId")
        node['parameters']['jsonBody'] = body
        
    elif node['name'] == 'Update Question Passed':
        body = node['parameters'].get('jsonBody', '')
        if "$('Initialize Variables').item.json.userId" in body:
            body = body.replace("$('Initialize Variables').item.json.userId", "$('Webhook Trigger').first().json.body.userId")
        node['parameters']['jsonBody'] = body
        
        # Fix array extraction from Supabase POST response
        url = node['parameters'].get('url', '')
        if 'item.json.id' in url and '[0]' not in url:
            url = url.replace('item.json.id', 'item.json[0].id')
            node['parameters']['url'] = url
            
        # Ensure Content-Type is set so Supabase doesn't ignore the body
        headers = node['parameters'].get('headerParameters', {}).get('parameters', [])
        has_content_type = any(h.get('name') == 'Content-Type' for h in headers)
        if not has_content_type:
            headers.append({
                "name": "Content-Type",
                "value": "application/json"
            })
            node['parameters'].setdefault('headerParameters', {})['parameters'] = headers

with open('Instaku Question Generation Final.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Successfully fixed Loop connections and data references!")
