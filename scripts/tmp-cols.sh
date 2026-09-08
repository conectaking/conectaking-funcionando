#!/bin/bash
docker exec conectaking-db psql -U conectaking -d conectaking -c '\d digital_form_items'
