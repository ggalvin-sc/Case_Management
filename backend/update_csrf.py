#!/usr/bin/env python3
"""
Updates server.js to use requireAuthAndCSRF for POST, PATCH, DELETE endpoints only
"""

with open('server.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Track if we're in a POST/PATCH/DELETE endpoint
state_changing_endpoint = False
lines_to_check = 3  # How many lines to check after finding a method

output_lines = []
i = 0
while i < len(lines):
    line = lines[i]

    # Check if this line declares a POST, PATCH, or DELETE endpoint
    if ("method === 'POST'" in line or
        "method === 'PATCH'" in line or
        "method === 'DELETE'" in line):
        state_changing_endpoint = True
        lines_to_check = 10  # Check next 10 lines for requireAuth
        output_lines.append(line)
        i += 1
        continue

    # If we're tracking a state-changing endpoint and find requireAuth
    if state_changing_endpoint and lines_to_check > 0:
        lines_to_check -= 1
        if 'const user = requireAuth(req, res);' in line:
            # Replace with requireAuthAndCSRF
            output_lines.append(line.replace('requireAuth(req, res)', 'requireAuthAndCSRF(req, res)'))
            state_changing_endpoint = False
            lines_to_check = 0
            i += 1
            continue
        elif lines_to_check == 0:
            state_changing_endpoint = False

    output_lines.append(line)
    i += 1

# Write back
with open('server.js', 'w', encoding='utf-8') as f:
    f.writelines(output_lines)

print("✓ Updated POST/PATCH/DELETE endpoints to use requireAuthAndCSRF")
print("✓ GET endpoints remain using requireAuth")
