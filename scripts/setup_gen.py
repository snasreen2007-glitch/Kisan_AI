# -*- coding: utf-8 -*-
import os

code_path = os.path.abspath("src/features/crop-care/services/llama.ts")

# Let's craft the python script that generates the complete llama.ts file
script_content = '''# -*- coding: utf-8 -*-
import os

OUT_FILE = "src/features/crop-care/services/llama.ts"

# Read header from scripts/build_llama_part1.txt
with open("scripts/build_llama_part1.txt", "r", encoding="utf-8") as f:
    header = f.read()

print("Writing full llama.ts...")
'''

with open("scripts/run_gen.py", "w", encoding="utf-8") as f:
    f.write(script_content)
print("run_gen.py created")

