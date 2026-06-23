import os
import subprocess

env_file = r"d:\AI\bindu-fashion-tracker\.env"

if not os.path.exists(env_file):
    print(".env file not found!")
    exit(1)

with open(env_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for line in lines:
    line = line.strip()
    if not line or line.startswith('#'):
        continue
    
    if '=' in line:
        key, val = line.split('=', 1)
        key = key.strip()
        val = val.strip()
        
        # Remove surrounding quotes
        if val.startswith('"') and val.endswith('"'):
            val = val[1:-1]
        elif val.startswith("'") and val.endswith("'"):
            val = val[1:-1]
            
        print(f"Adding {key} to Vercel...")
        
        # We need to run npx vercel env add {key} production preview development --force
        # and pass val to stdin
        cmd = ["npx", "vercel", "env", "add", key, "production", "preview", "development", "--force"]
        
        # Run process
        try:
            result = subprocess.run(
                cmd,
                input=val,
                text=True,
                capture_output=True,
                check=True,
                shell=True
            )
            print(result.stdout)
        except subprocess.CalledProcessError as e:
            print(f"Failed to add {key}: {e.stderr}")

print("All environment variables pushed to Vercel!")
