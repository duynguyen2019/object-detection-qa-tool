import traceback
import pandas as pd
from flask import Blueprint, request, render_template, jsonify, g, current_app
import os
import json
from sqlalchemy import create_engine

data_api = Blueprint('data_api', __name__, template_folder = 'templates')
@data_api.route('/api/populatedropdown', methods = ['GET', 'POST'])
def populatedropdown():
    print("populatedropdown")
    data = request.json
    selected_values = data.get('filter_dropdowns', {})  # Get all selected values from the filter_dropdowns
    
    if not selected_values:
        return jsonify({"error": "No selected values provided"}), 400

    # Fetch the dropdown data from the config
    filter_dropdowns = current_app.data_config.get('filter_dropdowns', {})
    initial_view = filter_dropdowns.get('initial_view')

    # Dictionary to store updated options for all dropdowns
    updated_dropdowns = {}

    # Get the engine to query the database
    eng = create_engine(os.getenv("DB_CONNECTION_STRING"))

    # Build the base query for filtering
    query_conditions = []
    for dropdown_key, dropdown_data in filter_dropdowns.items():
        if dropdown_key not in ['initial_view', 'dropdown_order']:
            # Get the field for the dropdown (e.g., 'county')
            field_name = dropdown_data.get('field')
            selected_value = selected_values.get(field_name)

            # Add a query condition if the dropdown has a selected value
            if selected_value:
                selected_value_list = ','.join([f"'{value}'" for value in selected_value.split(',')])
                query_conditions.append(f"{field_name} IN ({selected_value_list})")

    # Join the conditions into a WHERE clause
    where_clause = " AND ".join(query_conditions)

    # Find all dropdowns that need to be updated
    for dropdown_key, dropdown_data in filter_dropdowns.items():
        if dropdown_key not in ['initial_view', 'dropdown_order']:
            # Get the field for the dropdown (e.g., 'watershed')
            dependent_field = dropdown_data.get('field')

            # Build a dynamic SQL query to filter the dropdown options based on all selected values
            query = f"SELECT DISTINCT {dependent_field} FROM {initial_view}"
            if where_clause:
                query += f" WHERE {where_clause}"
            
            # Execute the query using pandas read_sql
            print(f"Executing query: {query}")
            try:
                df = pd.read_sql(query, eng)
                options = df[dependent_field].tolist()  # Extract the distinct values into a list
            except Exception as e:
                print(f"Error executing query: {e}")
                return jsonify({"error": "Database query failed"}), 500

            # Update the dropdown options with the filtered results
            updated_dropdowns[dropdown_key] = options

   
    return jsonify(updated_dropdowns)
