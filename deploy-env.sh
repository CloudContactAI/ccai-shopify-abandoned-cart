#!/bin/bash

# Read .env.production and set environment variables in Elastic Beanstalk
if [ -f .env.production ]; then
    # Convert .env.production to eb setenv format
    ENV_VARS=$(grep -v '^#' .env.production | grep -v '^$' | sed 's/=/ /' | awk '{print $1"="$2}' | tr '\n' ' ')
    
    echo "Setting environment variables in Elastic Beanstalk..."
    eb setenv $ENV_VARS
    
    echo "Environment variables set successfully!"
else
    echo ".env.production file not found!"
fi