import sys

file_path = r'C:\Users\BHANU\OneDrive\Desktop\HEART\heartguard_backend\static\script.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('\\`', '`').replace('\\${', '${')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done fixing script.js")
