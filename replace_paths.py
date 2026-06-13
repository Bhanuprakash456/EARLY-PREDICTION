import os

template_dir = r"C:\Users\BHANU\OneDrive\Desktop\HEART\heartguard_backend\templates"
for filename in os.listdir(template_dir):
    if filename.endswith(".html"):
        filepath = os.path.join(template_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        content = content.replace('href="style.css"', 'href="/static/style.css"')
        content = content.replace('src="script.js"', 'src="/static/script.js"')
        # Some files might have assets/ references if any
        content = content.replace('src="assets/', 'src="/static/assets/')
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
print("Static paths updated successfully.")
