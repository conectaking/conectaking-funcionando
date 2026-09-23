#!/usr/bin/env python3
import json, subprocess

cmd = [
    'docker', 'exec', 'ck-agent-n8n', 'node', '-e',
    """
    const { GoogleCalendar } = require('/usr/local/lib/node_modules/n8n/node_modules/.pnpm/n8n-nodes-base@file+packages+nodes-base_@opentelemetry+api@1.9.1_@opentelemetry+core@2._6652c84fadaf24e40134dd21753e52b0/node_modules/n8n-nodes-base/dist/nodes/Google/Calendar/GoogleCalendar.node.js');
    const instance = new GoogleCalendar();
    const props = instance.description.properties;
    const addFields = props.find(p => p.name === 'additionalFields');
    const inAddFields = addFields ? addFields.options.filter(o => o.name === 'useDefaultReminders' || o.name === 'remindersUi') : [];
    const inRoot = props.filter(p => p.name === 'useDefaultReminders' || p.name === 'remindersUi');
    console.log(JSON.stringify({ inRoot, inAddFields }, null, 2));
    """
]
out = subprocess.check_output(cmd).decode('utf-8')
print(out)
