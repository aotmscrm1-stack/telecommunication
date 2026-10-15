# Google Sheets All Tabs → CRM Render Backend (n8n)

## Included sheet tabs
- Digital Marketing_Leads
- SAP_Leads
- Python_Leads
- CyberSecurity_Leads

Each tab reads columns A:ZZ. Confirm these exact tab names exist; edit/remove/add reader nodes if your spreadsheet has other tabs.

## Import
1. In n8n, choose Workflows → Import from File.
2. Import `google_sheets_all_tabs_render_crm.json`.
3. Open each `Read - ...` node and select your working Google Sheets OAuth credential. The credential ID in an exported workflow may not exist in another n8n instance.
4. Run the workflow and inspect each Read node and `Combine All Tabs`.

## Important backend configuration
The HTTP Request URL starts with your supplied Render API base:
`https://telecommunication-l3oz.onrender.com/api`

The exact lead-create route was not provided, so the URL intentionally ends in:
`/REPLACE_WITH_REAL_LEAD_ENDPOINT`

Also replace `Bearer REPLACE_WITH_CRM_TOKEN` and map the body to the exact fields expected by your backend. The CRM node is disabled until configured, to prevent accidental failed imports.

## Notes
- `A:ZZ` reads columns A through ZZ, not every tab automatically; each tab has its own reader node.
- This starter workflow does not deduplicate leads. Add backend-side idempotency/deduplication before importing production data.
- The five tab names are based on the names supplied in the conversation; add nodes for any other tabs.


n8n workflow :
{
  "name": "Google Sheets All Leads to CRM - Render Backend",
  "nodes": [
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaC1lzpOxnn1vCeTAY9nX2Jg",
        "range": "'Digital Marketing_Leads'!A:ZZ",
        "options": {}
      },
      "id": "c3b18d95-cc93-46f2-a8fb-f0795feb6270",
      "name": "Read - Digital Marketing_Leads",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        496,
        176
      ],
      "alwaysOutputData": false,
      "executeOnce": false,
      "notesInFlow": true,
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      },
      "notes": "Reads all columns A:ZZ from the 'Digital Marketing_Leads' tab. After import, select the Google Sheets credential that has access to this spreadsheet."
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaC1lzpOxnn1vCeTAY9nX2Jg",
        "range": "'SAP_Leads'!A:ZZ",
        "options": {}
      },
      "id": "feccae78-fda0-41f7-9149-a0f876e2c5c6",
      "name": "Read - SAP_Leads",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        496,
        336
      ],
      "alwaysOutputData": false,
      "executeOnce": false,
      "notesInFlow": true,
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      },
      "notes": "Reads all columns A:ZZ from the 'SAP_Leads' tab. After import, select the Google Sheets credential that has access to this spreadsheet."
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaC1lzpOxnn1vCeTAY9nX2Jg",
        "range": "'Python_Leads'!A:ZZ",
        "options": {}
      },
      "id": "bed451e4-c0ec-4e74-9c82-d94e19961d91",
      "name": "Read - Python_Leads",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        496,
        512
      ],
      "alwaysOutputData": false,
      "executeOnce": false,
      "notesInFlow": true,
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      },
      "notes": "Reads all columns A:ZZ from the 'Python_Leads' tab. After import, select the Google Sheets credential that has access to this spreadsheet."
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaC1lzpOxnn1vCeTAY9nX2Jg",
        "range": "'CyberSecurity_Leads'!A:ZZ",
        "options": {}
      },
      "id": "5c281f54-6337-4d67-bada-c9081624078d",
      "name": "Read - CyberSecurity_Leads",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        496,
        704
      ],
      "alwaysOutputData": false,
      "executeOnce": false,
      "notesInFlow": true,
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      },
      "notes": "Reads all columns A:ZZ from the 'CyberSecurity_Leads' tab. After import, select the Google Sheets credential that has access to this spreadsheet."
    },
    {
      "parameters": {
        "numberInputs": 5
      },
      "id": "78b5c18c-9a0c-450e-92eb-21273ef53882",
      "name": "Combine All Tabs",
      "type": "n8n-nodes-base.merge",
      "typeVersion": 3.2,
      "position": [
        1024,
        352
      ],
      "notesInFlow": true,
      "notes": "Combines rows from the five configured sheet tabs. If your n8n version uses a different Merge node UI, set Mode to Append and connect each Read node to a separate input."
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://telecommunication-l3oz.onrender.com/api/REPLACE_WITH_REAL_LEAD_ENDPOINT",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "Bearer REPLACE_WITH_CRM_TOKEN"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ { name: $json.name || $json.Name || $json['Full Name'] || '', email: $json.email || $json.Email || '', phone: $json.phone || $json.Phone || $json.mobile || '', source: 'google_sheets', company: $json.company || $json.Company || '' } }}",
        "options": {}
      },
      "id": "676b1d29-9d7e-45e0-bd4e-5a230216587a",
      "name": "Create Lead in CRM1",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        1472,
        400
      ],
      "notesInFlow": true,
      "disabled": true,
      "notes": "Disabled intentionally until the real lead-create endpoint, authentication, and request schema are confirmed. Replace the endpoint suffix and token, then map fields to your backend's expected schema."
    },
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "Meta_Leads",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.2,
      "position": [
        -96,
        416
      ],
      "id": "37674129-7e79-400e-8c48-3557dc2b920a",
      "name": "Webhook",
      "webhookId": "d64b82cd-b8b1-4934-bb84-b90268fd084f"
    }
  ],
  "pinData": {},
  "connections": {
    "Combine All Tabs": {
      "main": [
        [
          {
            "node": "Create Lead in CRM1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Read - Digital Marketing_Leads": {
      "main": [
        [
          {
            "node": "Combine All Tabs",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Read - SAP_Leads": {
      "main": [
        [
          {
            "node": "Combine All Tabs",
            "type": "main",
            "index": 1
          }
        ]
      ]
    },
    "Read - Python_Leads": {
      "main": [
        [
          {
            "node": "Combine All Tabs",
            "type": "main",
            "index": 2
          }
        ]
      ]
    },
    "Read - CyberSecurity_Leads": {
      "main": [
        [
          {
            "node": "Combine All Tabs",
            "type": "main",
            "index": 3
          }
        ]
      ]
    },
    "Webhook": {
      "main": [
        [
          {
            "node": "Read - Digital Marketing_Leads",
            "type": "main",
            "index": 0
          },
          {
            "node": "Read - SAP_Leads",
            "type": "main",
            "index": 0
          },
          {
            "node": "Read - Python_Leads",
            "type": "main",
            "index": 0
          },
          {
            "node": "Read - CyberSecurity_Leads",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {
    "executionOrder": "v1",
    "binaryMode": "separate"
  },
  "versionId": "c837c550-54ea-4c4a-9bf7-f0a1968c42fa",
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "ac53766b75ba98327cb8367953362c144cd1e7b33149a3b252d1556380af54e8"
  },
  "nodeGroups": [],
  "id": "Cf3Wiu05i5DH1X7q",
  "tags": []
}