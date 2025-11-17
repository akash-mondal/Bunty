#!/bin/bash

# Load environment variables from .env file
set -a
source .env
set +a

# Start the development server
npm run dev
