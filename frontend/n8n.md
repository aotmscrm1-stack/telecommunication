{
  "name": "CRM Meta_Leads",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "Meta_Leads",
        "responseMode": "lastNode",
        "options": {}
      },
      "id": "9c7438e9-8a9c-445b-8c4f-d167aad6ffb3",
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.2,
      "position": [
        -448,
        2304
      ],
      "webhookId": "2c5999ed-5809-43d8-b07b-d82bfdd5ffdd"
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg",
        "range": "'Digital Marketing_Leads'!A:ZZ",
        "options": {}
      },
      "id": "499edd7a-bb70-416e-9558-093a75b80e26",
      "name": "Read - Digital Marketing",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        656,
        1456
      ],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "camp_tag___digital_marketing",
              "name": "campaign",
              "value": "Digital Marketing_Leads",
              "type": "string"
            },
            {
              "id": "name_tag___digital_marketing",
              "name": "name",
              "value": "={{ $json.full_name || $json.name || $json.Name || $json['Full Name'] || $json['Candidate Name'] || $json['Student Name'] || '' }}",
              "type": "string"
            },
            {
              "id": "email_tag___digital_marketing",
              "name": "email",
              "value": "={{ $json.email || $json.Email || $json['Email Address'] || $json['email_address'] || '' }}",
              "type": "string"
            },
            {
              "id": "mobile_tag___digital_marketing",
              "name": "mobile",
              "value": "={{ $json.phone_number || $json.phone || $json.mobile || $json.Mobile || $json.Contact || $json['Phone Number'] || $json['Contact Number'] || '' }}",
              "type": "string"
            },
            {
              "id": "city_tag___digital_marketing",
              "name": "city",
              "value": "={{ $json.city || $json.location || $json.City || $json.Location || $json.town || $json.Town || '' }}",
              "type": "string"
            }
          ]
        },
        "includeOtherFields": false,
        "options": {}
      },
      "id": "64268f14-0a08-4f60-ac08-1d1d177886d1",
      "name": "Tag - Digital Marketing",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        976,
        1456
      ]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg",
        "range": "'SAP_Leads'!A:ZZ",
        "options": {}
      },
      "id": "49cbf922-1c14-46c7-89b0-c47e36aa494b",
      "name": "Read - SAP Leads",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        656,
        1648
      ],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "camp_tag___sap_leads",
              "name": "campaign",
              "value": "SAP_Leads",
              "type": "string"
            },
            {
              "id": "name_tag___sap_leads",
              "name": "name",
              "value": "={{ $json.full_name || $json.name || $json.Name || $json['Full Name'] || $json['Candidate Name'] || $json['Student Name'] || '' }}",
              "type": "string"
            },
            {
              "id": "email_tag___sap_leads",
              "name": "email",
              "value": "={{ $json.email || $json.Email || $json['Email Address'] || $json['email_address'] || '' }}",
              "type": "string"
            },
            {
              "id": "mobile_tag___sap_leads",
              "name": "mobile",
              "value": "={{ $json.phone_number || $json.phone || $json.mobile || $json.Mobile || $json.Contact || $json['Phone Number'] || $json['Contact Number'] || '' }}",
              "type": "string"
            },
            {
              "id": "city_tag___sap_leads",
              "name": "city",
              "value": "={{ $json.city || $json.location || $json.City || $json.Location || $json.town || $json.Town || '' }}",
              "type": "string"
            }
          ]
        },
        "includeOtherFields": false,
        "options": {}
      },
      "id": "fab0d3e4-168a-4a44-9e5c-5ef276af64c9",
      "name": "Tag - SAP Leads",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        976,
        1648
      ]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg",
        "range": "'Python_Leads'!A:ZZ",
        "options": {}
      },
      "id": "2612f9b1-0e79-4fa4-a55c-303e889bcf56",
      "name": "Read - Python Leads",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        656,
        1824
      ],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "camp_tag___python_leads",
              "name": "campaign",
              "value": "Python_Leads",
              "type": "string"
            },
            {
              "id": "name_tag___python_leads",
              "name": "name",
              "value": "={{ $json.full_name || $json.name || $json.Name || $json['Full Name'] || $json['Candidate Name'] || $json['Student Name'] || '' }}",
              "type": "string"
            },
            {
              "id": "email_tag___python_leads",
              "name": "email",
              "value": "={{ $json.email || $json.Email || $json['Email Address'] || $json['email_address'] || '' }}",
              "type": "string"
            },
            {
              "id": "mobile_tag___python_leads",
              "name": "mobile",
              "value": "={{ $json.phone_number || $json.phone || $json.mobile || $json.Mobile || $json.Contact || $json['Phone Number'] || $json['Contact Number'] || '' }}",
              "type": "string"
            },
            {
              "id": "city_tag___python_leads",
              "name": "city",
              "value": "={{ $json.city || $json.location || $json.City || $json.Location || $json.town || $json.Town || '' }}",
              "type": "string"
            }
          ]
        },
        "includeOtherFields": false,
        "options": {}
      },
      "id": "97637410-8c33-44bc-8348-5a021236d241",
      "name": "Tag - Python Leads",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        1008,
        1824
      ]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg",
        "range": "'CyberSecurity_Leads'!A:ZZ",
        "options": {}
      },
      "id": "6e687e0a-4075-420e-9299-5f98da77ef27",
      "name": "Read - CyberSecurity Leads",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        656,
        2016
      ],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "camp_tag___cybersecurity_leads",
              "name": "campaign",
              "value": "CyberSecurity_Leads",
              "type": "string"
            },
            {
              "id": "name_tag___cybersecurity_leads",
              "name": "name",
              "value": "={{ $json.full_name || $json.name || $json.Name || $json['Full Name'] || $json['Candidate Name'] || $json['Student Name'] || '' }}",
              "type": "string"
            },
            {
              "id": "email_tag___cybersecurity_leads",
              "name": "email",
              "value": "={{ $json.email || $json.Email || $json['Email Address'] || $json['email_address'] || '' }}",
              "type": "string"
            },
            {
              "id": "mobile_tag___cybersecurity_leads",
              "name": "mobile",
              "value": "={{ $json.phone_number || $json.phone || $json.mobile || $json.Mobile || $json.Contact || $json['Phone Number'] || $json['Contact Number'] || '' }}",
              "type": "string"
            },
            {
              "id": "city_tag___cybersecurity_leads",
              "name": "city",
              "value": "={{ $json.city || $json.location || $json.City || $json.Location || $json.town || $json.Town || '' }}",
              "type": "string"
            }
          ]
        },
        "includeOtherFields": false,
        "options": {}
      },
      "id": "9735c10d-2c12-471c-896f-1e02f1825d9f",
      "name": "Tag - CyberSecurity Leads",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        992,
        2016
      ]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1M2GDTW065pJU6eBk0BiDrp1Tio1V6ffEevuNQnwbIe4",
        "range": "'Website_Leads'!A:ZZ",
        "options": {}
      },
      "id": "84bf1a28-f980-4741-85bf-d0e290e95e66",
      "name": "website_Leads",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        656,
        2208
      ],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "camp_website_leads",
              "name": "campaign",
              "value": "Website_Leads",
              "type": "string"
            },
            {
              "id": "name_website_leads",
              "name": "name",
              "value": "={{ $json.full_name || $json.name || $json.Name || $json['Full Name'] || $json['Candidate Name'] || $json['Student Name'] || '' }}",
              "type": "string"
            },
            {
              "id": "email_website_leads",
              "name": "email",
              "value": "={{ $json.email || $json.Email || $json['Email Address'] || $json['email_address'] || '' }}",
              "type": "string"
            },
            {
              "id": "mobile_website_leads",
              "name": "mobile",
              "value": "={{ $json.phone_number || $json.phone || $json.mobile || $json.Mobile || $json.Contact || $json['Phone Number'] || $json['Contact Number'] || '' }}",
              "type": "string"
            },
            {
              "id": "city_website_leads",
              "name": "city",
              "value": "={{ $json.city || $json.location || $json.City || $json.Location || $json.town || $json.Town || '' }}",
              "type": "string"
            }
          ]
        },
        "includeOtherFields": false,
        "options": {}
      },
      "id": "88fcc055-b1bf-48ca-8f29-772f9580d336",
      "name": "Website_Leads",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        1008,
        2208
      ]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1Df8LIYoUfZb-qvmv7ZHwAy5iV7gFv9H0QeFLXDZF1XI",
        "range": "'Practice Sheet'!A:ZZ",
        "options": {}
      },
      "id": "42dbf83e-5b95-4ae5-9836-f204706e3827",
      "name": "Practice Sheet1",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        672,
        2400
      ],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "camp_practice_sheet",
              "name": "campaign",
              "value": "Practice Sheet",
              "type": "string"
            },
            {
              "id": "name_practice_sheet",
              "name": "name",
              "value": "={{ $json.full_name || $json.name || $json.Name || $json['Full Name'] || $json['Candidate Name'] || $json['Student Name'] || '' }}",
              "type": "string"
            },
            {
              "id": "email_practice_sheet",
              "name": "email",
              "value": "={{ $json.email || $json.Email || $json['Email Address'] || $json['email_address'] || '' }}",
              "type": "string"
            },
            {
              "id": "mobile_practice_sheet",
              "name": "mobile",
              "value": "={{ $json.phone_number || $json.phone || $json.mobile || $json.Mobile || $json.Contact || $json['Phone Number'] || $json['Contact Number'] || '' }}",
              "type": "string"
            },
            {
              "id": "city_practice_sheet",
              "name": "city",
              "value": "={{ $json.city || $json.location || $json.City || $json.Location || $json.town || $json.Town || '' }}",
              "type": "string"
            }
          ]
        },
        "includeOtherFields": false,
        "options": {}
      },
      "id": "767a28db-764e-4d02-ab66-b9c404e6fbef",
      "name": "Practice Sheet",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        992,
        2400
      ]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg",
        "range": "'DSAPython_workshop'!A:ZZ",
        "options": {}
      },
      "id": "a70cdc21-700e-4291-b4a6-3db583b42798",
      "name": "DSAPython_workshop",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        672,
        2592
      ],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "camp_dsapython_workshop1",
              "name": "campaign",
              "value": "DSAPython_workshop",
              "type": "string"
            },
            {
              "id": "name_dsapython_workshop1",
              "name": "name",
              "value": "={{ $json.full_name || $json.name || $json.Name || $json['Full Name'] || $json['Candidate Name'] || $json['Student Name'] || '' }}",
              "type": "string"
            },
            {
              "id": "email_dsapython_workshop1",
              "name": "email",
              "value": "={{ $json.email || $json.Email || $json['Email Address'] || $json['email_address'] || '' }}",
              "type": "string"
            },
            {
              "id": "mobile_dsapython_workshop1",
              "name": "mobile",
              "value": "={{ $json.phone_number || $json.phone || $json.mobile || $json.Mobile || $json.Contact || $json['Phone Number'] || $json['Contact Number'] || '' }}",
              "type": "string"
            },
            {
              "id": "city_dsapython_workshop1",
              "name": "city",
              "value": "={{ $json.city || $json.location || $json.City || $json.Location || $json.town || $json.Town || '' }}",
              "type": "string"
            }
          ]
        },
        "includeOtherFields": false,
        "options": {}
      },
      "id": "58946815-9aad-4a81-a636-445e7f6c2e1a",
      "name": "DSAPython_workshop1",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        1008,
        2592
      ]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg",
        "range": "'Cyber security workshop oct 22/10'!A:ZZ",
        "options": {}
      },
      "id": "20f483c7-d9a0-46a9-b12c-ba18dae0e599",
      "name": "Cyber security workshop oct 22/",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        672,
        2800
      ],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "camp_cyber_security_workshop_oct_22_10",
              "name": "campaign",
              "value": "Cyber security workshop oct 22/10",
              "type": "string"
            },
            {
              "id": "name_cyber_security_workshop_oct_22_10",
              "name": "name",
              "value": "={{ $json.full_name || $json.name || $json.Name || $json['Full Name'] || $json['Candidate Name'] || $json['Student Name'] || '' }}",
              "type": "string"
            },
            {
              "id": "email_cyber_security_workshop_oct_22_10",
              "name": "email",
              "value": "={{ $json.email || $json.Email || $json['Email Address'] || $json['email_address'] || '' }}",
              "type": "string"
            },
            {
              "id": "mobile_cyber_security_workshop_oct_22_10",
              "name": "mobile",
              "value": "={{ $json.phone_number || $json.phone || $json.mobile || $json.Mobile || $json.Contact || $json['Phone Number'] || $json['Contact Number'] || '' }}",
              "type": "string"
            },
            {
              "id": "city_cyber_security_workshop_oct_22_10",
              "name": "city",
              "value": "={{ $json.city || $json.location || $json.City || $json.Location || $json.town || $json.Town || '' }}",
              "type": "string"
            }
          ]
        },
        "includeOtherFields": false,
        "options": {}
      },
      "id": "d829ec6e-1a4f-419c-8199-632b9641da30",
      "name": "Cyber security workshop oct 22/10",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        992,
        2800
      ]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg",
        "range": "'UI/UX_Leads'!A:ZZ",
        "options": {}
      },
      "id": "0c978004-1f9d-40c7-9852-b182bd8678c7",
      "name": "UI/UX_Leads1",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        672,
        3024
      ],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "camp_ui_ux_leads",
              "name": "campaign",
              "value": "UI/UX_Leads",
              "type": "string"
            },
            {
              "id": "name_ui_ux_leads",
              "name": "name",
              "value": "={{ $json.full_name || $json.name || $json.Name || $json['Full Name'] || $json['Candidate Name'] || $json['Student Name'] || '' }}",
              "type": "string"
            },
            {
              "id": "email_ui_ux_leads",
              "name": "email",
              "value": "={{ $json.email || $json.Email || $json['Email Address'] || $json['email_address'] || '' }}",
              "type": "string"
            },
            {
              "id": "mobile_ui_ux_leads",
              "name": "mobile",
              "value": "={{ $json.phone_number || $json.phone || $json.mobile || $json.Mobile || $json.Contact || $json['Phone Number'] || $json['Contact Number'] || '' }}",
              "type": "string"
            },
            {
              "id": "city_ui_ux_leads",
              "name": "city",
              "value": "={{ $json.city || $json.location || $json.City || $json.Location || $json.town || $json.Town || '' }}",
              "type": "string"
            }
          ]
        },
        "includeOtherFields": false,
        "options": {}
      },
      "id": "991534b7-a9cc-40b6-8689-2bcc2c7c4b30",
      "name": "UI/UX_Leads",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        992,
        3024
      ]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaCl1zpOxnn1vCeTAY9nX2Jg",
        "range": "'Data_Careers_Leads'!A:ZZ",
        "options": {}
      },
      "id": "9fdd9b76-21af-462b-b731-25574d82b2ec",
      "name": "Data_Careers_Leads",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        672,
        3264
      ],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "camp_data_careers_leads1",
              "name": "campaign",
              "value": "Data_Careers_Leads",
              "type": "string"
            },
            {
              "id": "name_data_careers_leads1",
              "name": "name",
              "value": "={{ $json.full_name || $json.name || $json.Name || $json['Full Name'] || $json['Candidate Name'] || $json['Student Name'] || '' }}",
              "type": "string"
            },
            {
              "id": "email_data_careers_leads1",
              "name": "email",
              "value": "={{ $json.email || $json.Email || $json['Email Address'] || $json['email_address'] || '' }}",
              "type": "string"
            },
            {
              "id": "mobile_data_careers_leads1",
              "name": "mobile",
              "value": "={{ $json.phone_number || $json.phone || $json.mobile || $json.Mobile || $json.Contact || $json['Phone Number'] || $json['Contact Number'] || '' }}",
              "type": "string"
            },
            {
              "id": "city_data_careers_leads1",
              "name": "city",
              "value": "={{ $json.city || $json.location || $json.City || $json.Location || $json.town || $json.Town || '' }}",
              "type": "string"
            }
          ]
        },
        "includeOtherFields": false,
        "options": {}
      },
      "id": "921bf1a3-bb2f-42aa-b309-b88e0fc65efe",
      "name": "Data_Careers_Leads1",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        1008,
        3264
      ]
    },
    {
      "parameters": {
        "numberInputs": 10
      },
      "id": "011ad143-63ff-4778-b7db-5bf405db9713",
      "name": "Combine All Tabs1",
      "type": "n8n-nodes-base.merge",
      "typeVersion": 3.2,
      "position": [
        2192,
        2064
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.academyoftechmasters.com/api/meta-leads",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ { campaign: $json.campaign, source: 'google_sheets_meta', name: $json.name, email: $json.email, phone: $json.mobile, city: $json.city, rawData: { name: $json.name, email: $json.email, phone: $json.mobile, location: $json.city } } }}",
        "options": {
          "batching": {
            "batch": {
              "batchSize": 10
            }
          },
          "timeout": 60000
        }
      },
      "id": "db2649c1-8fb3-4173-880f-956d060e0532",
      "name": "Sync Lead to CRM",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        3392,
        2176
      ],
      "retryOnFail": true,
      "maxTries": 5,
      "waitBetweenTries": 5000,
      "onError": "continueRegularOutput"
    }
  ],
  "pinData": {},
  "connections": {
    "Webhook Trigger": {
      "main": [
        [
          {
            "node": "Read - Digital Marketing",
            "type": "main",
            "index": 0
          },
          {
            "node": "Read - SAP Leads",
            "type": "main",
            "index": 0
          },
          {
            "node": "Read - Python Leads",
            "type": "main",
            "index": 0
          },
          {
            "node": "Read - CyberSecurity Leads",
            "type": "main",
            "index": 0
          },
          {
            "node": "website_Leads",
            "type": "main",
            "index": 0
          },
          {
            "node": "Practice Sheet1",
            "type": "main",
            "index": 0
          },
          {
            "node": "DSAPython_workshop",
            "type": "main",
            "index": 0
          },
          {
            "node": "Cyber security workshop oct 22/",
            "type": "main",
            "index": 0
          },
          {
            "node": "UI/UX_Leads1",
            "type": "main",
            "index": 0
          },
          {
            "node": "Data_Careers_Leads",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Read - Digital Marketing": {
      "main": [
        [
          {
            "node": "Tag - Digital Marketing",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Tag - Digital Marketing": {
      "main": [
        [
          {
            "node": "Combine All Tabs1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Read - SAP Leads": {
      "main": [
        [
          {
            "node": "Tag - SAP Leads",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Tag - SAP Leads": {
      "main": [
        [
          {
            "node": "Combine All Tabs1",
            "type": "main",
            "index": 1
          }
        ]
      ]
    },
    "Read - Python Leads": {
      "main": [
        [
          {
            "node": "Tag - Python Leads",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Tag - Python Leads": {
      "main": [
        [
          {
            "node": "Combine All Tabs1",
            "type": "main",
            "index": 2
          }
        ]
      ]
    },
    "Read - CyberSecurity Leads": {
      "main": [
        [
          {
            "node": "Tag - CyberSecurity Leads",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Tag - CyberSecurity Leads": {
      "main": [
        [
          {
            "node": "Combine All Tabs1",
            "type": "main",
            "index": 3
          }
        ]
      ]
    },
    "website_Leads": {
      "main": [
        [
          {
            "node": "Website_Leads",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Website_Leads": {
      "main": [
        [
          {
            "node": "Combine All Tabs1",
            "type": "main",
            "index": 4
          }
        ]
      ]
    },
    "Practice Sheet1": {
      "main": [
        [
          {
            "node": "Practice Sheet",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Practice Sheet": {
      "main": [
        [
          {
            "node": "Combine All Tabs1",
            "type": "main",
            "index": 5
          }
        ]
      ]
    },
    "DSAPython_workshop": {
      "main": [
        [
          {
            "node": "DSAPython_workshop1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "DSAPython_workshop1": {
      "main": [
        [
          {
            "node": "Combine All Tabs1",
            "type": "main",
            "index": 6
          }
        ]
      ]
    },
    "Cyber security workshop oct 22/": {
      "main": [
        [
          {
            "node": "Cyber security workshop oct 22/10",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Cyber security workshop oct 22/10": {
      "main": [
        [
          {
            "node": "Combine All Tabs1",
            "type": "main",
            "index": 7
          }
        ]
      ]
    },
    "UI/UX_Leads1": {
      "main": [
        [
          {
            "node": "UI/UX_Leads",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "UI/UX_Leads": {
      "main": [
        [
          {
            "node": "Combine All Tabs1",
            "type": "main",
            "index": 8
          }
        ]
      ]
    },
    "Data_Careers_Leads": {
      "main": [
        [
          {
            "node": "Data_Careers_Leads1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Data_Careers_Leads1": {
      "main": [
        [
          {
            "node": "Combine All Tabs1",
            "type": "main",
            "index": 9
          }
        ]
      ]
    },
    "Combine All Tabs1": {
      "main": [
        [
          {
            "node": "Sync Lead to CRM",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true,
  "settings": {
    "executionOrder": "v1",
    "binaryMode": "separate",
    "timeSavedMode": "fixed",
    "callerPolicy": "workflowsFromSameOwner",
    "availableInMCP": false
  },
  "versionId": "7ade7719-c0c5-4f60-a849-6c5270a265d1",
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "ac53766b75ba98327cb8367953362c144cd1e7b33149a3b252d1556380af54e8"
  },
  "nodeGroups": [],
  "id": "Cf3Wiu05i5DH1X7q",
  "tags": []
}