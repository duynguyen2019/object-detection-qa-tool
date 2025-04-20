#!/bin/bash

# Name of the Conda environment
ENV_NAME="ultralytics_env"

# Create a new Conda environment with Python 3.12
echo "Creating a new Conda environment: $ENV_NAME with Python 3.12..."
conda create -n $ENV_NAME python=3.12 -y

# Activate the new environment
echo "Activating the Conda environment: $ENV_NAME..."
source activate $ENV_NAME

# Install the required packages
echo "Installing packages in $ENV_NAME..."
pip install ultralytics==8.3.44
pip install opencv-python-headless==4.10.0.84
pip install ipython
pip install boto3
pip install roboflow
pip install flask
pip install sqlalchemy

# Notify user of completion and active environment
conda activate $ENV_NAME
echo "Environment setup complete. '$ENV_NAME' is now active."