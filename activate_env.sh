#!/bin/bash
echo "Activating barcode generator environment..."
source barcode_env/bin/activate
echo "Environment activated! You can now run: python barcode_generator.py"
exec "$SHELL"
