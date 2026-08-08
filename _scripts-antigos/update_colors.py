import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Generic background replacements
    content = content.replace('bg-[#0A0A0A]', 'bg-slate-50 dark:bg-[#0A0A0A]')
    content = content.replace('bg-[#1A1A1A]', 'bg-white dark:bg-[#1A1A1A]')
    content = content.replace('bg-[#121212]', 'bg-white dark:bg-[#121212]')
    content = content.replace('bg-zinc-800', 'bg-slate-200 dark:bg-zinc-800')
    content = content.replace('bg-zinc-900', 'bg-slate-100 dark:bg-zinc-900')
    
    # Generic borders
    content = content.replace('border-[#2A2A2A]', 'border-slate-200 dark:border-[#2A2A2A]')
    
    # Text colors
    content = content.replace('text-white', 'text-slate-900 dark:text-white')
    content = content.replace('text-zinc-400', 'text-slate-500 dark:text-zinc-400')
    content = content.replace('text-zinc-500', 'text-slate-500 dark:text-zinc-500')
    content = content.replace('text-zinc-300', 'text-slate-700 dark:text-zinc-300')
    
    # Some specific fixes because of duplicate text-slate-900 dark:text-slate-900 etc
    content = content.replace('dark:text-slate-900 dark:text-white', 'dark:text-white')
    content = content.replace('dark:bg-slate-50 dark:bg-[#0A0A0A]', 'dark:bg-[#0A0A0A]')
    
    with open(filepath, 'w') as f:
        f.write(content)

for root, _, files in os.walk('src/components/draft'):
    for file in files:
        if file.endswith('.tsx'):
            process_file(os.path.join(root, file))

