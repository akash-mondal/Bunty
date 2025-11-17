#!/bin/bash

# Load environment variables from .env file
export $(cat .env | grep -v '^#' | xargs)

# Run the test script
npx ts-node src/scripts/test-persona-integration.ts
