import traceback
import pandas as pd
from flask import Blueprint, request, render_template, jsonify, g, current_app, send_file
import os
import json
import zipfile
from datetime import datetime
import time
import shutil
import psycopg2
from psycopg2 import sql
import datetime
from sqlalchemy import text
from io import BytesIO, StringIO

from .utils import *
from .mail import send_mail, data_receipt

download = Blueprint('download', __name__, template_folder = 'templates')
@download.route('/downloaddata', methods = ['GET','POST'])
def download_data():
    try:
        # Get the posted data (JSON payload)
        data = request.json

        print("Data received:")
        print(data)

        filter_data = data.get('filter', {})
        datatype_data = data.get('datatype', {})

        # Get the database engine
        eng = create_engine(os.getenv("DB_CONNECTION_STRING"))

        # Initialize an in-memory bytes buffer to store the ZIP file
        zip_buffer = BytesIO()

        # Create a zip file in memory
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Iterate over each datatype and construct a query
            for datatype_key, datatype_value in datatype_data.items():
                # Get the table info from config
                table_info = current_app.data_config['data_dropdowns'][datatype_key]

                # Split the `datatype_value` string into individual values (e.g., 'algae, asci')
                datatype_values = [v.strip() for v in datatype_value.split(',')]
                
                for dt_value in datatype_values:  # Loop through each value (e.g., 'algae', 'asci')
                    table_name = None

                    # Find the correct table based on the selected datatype
                    for option_dict in table_info.get('options', []):  # Loop through the 'options' list
                        for option_key, option_value in option_dict.items():  # Loop through each dict inside 'options'
                            if option_key == dt_value:
                                # If a match is found, extract the table name
                                table_name = option_value['table']
                                print(f"Table name for {dt_value}: {table_name}")
                                break

                        if table_name:
                            break  # Break out of the loop once we find the table

                    if table_name:

                        # Construct the SQL query
                        query = f"SELECT * FROM {table_name} WHERE 1=1"

                        # Fetch available columns from information_schema.columns
                        table_columns_query = f"""
                        SELECT column_name FROM information_schema.columns 
                        WHERE table_name = '{table_name}'
                        """
                        available_columns = pd.read_sql(table_columns_query, eng)['column_name'].tolist()

                        # Add filters to the query (if applicable)
                        for filter_key, filter_value in filter_data.items():
                            flag = 0
                            # Check if the filter exists in the table using information_schema.columns
                            if filter_key in available_columns:
                                query += " AND {} IN ({})".format(
                                    filter_key,
                                    ','.join(["'{}'".format(v.strip()) for v in filter_value.split(',')])
                                )
                                flag = 1

                            # SPECIAL CASE: Check for 'stationid' filter and match it with 'stationcode' column
                            if flag == 0 and filter_key == 'stationid':
                                if 'stationcode' in available_columns:
                                    query += " AND {} IN ({})".format(
                                        'stationcode',
                                        ','.join(["'{}'".format(v.strip()) for v in filter_value.split(',')])
                                    )
                                flag = 1

                        print(f"Query for {dt_value}: {query}")

                        # Fetch the data
                        df = pd.read_sql(query, eng)

                        # Write the dataframe to a CSV file in memory
                        csv_buffer = StringIO()
                        df.to_csv(csv_buffer, index=False)

                        # Add the CSV file to the zip file in memory
                        zip_file.writestr(f"{dt_value}.csv", csv_buffer.getvalue())

        # Reset the buffer position to the beginning
        zip_buffer.seek(0)

        # Send the zip file as a response
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name='data.zip'
        )

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500
    