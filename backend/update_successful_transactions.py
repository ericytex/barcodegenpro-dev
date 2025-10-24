
import sqlite3
import requests
import json

import os

def update_successful_transactions():
    """
    Queries for pending transactions and updates their status to 'completed'
    by calling the /api/payments/test-payment endpoint.
    """
    # Get the absolute path to the database file
    db_path = os.path.join(os.path.dirname(__file__), "data/barcode_generator.db")
    api_url = "http://127.0.0.1:8000/api/payments/test-payment"

    conn = None  # Initialize conn to None
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Query for pending transactions
        cursor.execute("SELECT transaction_uid FROM payment_transactions WHERE status = 'pending'")
        pending_transactions = cursor.fetchall()

        if not pending_transactions:
            print("No pending transactions found.")
            return

        print(f"Found {len(pending_transactions)} pending transactions. Updating...")

        for transaction in pending_transactions:
            transaction_uid = transaction[0]
            print(f"Updating transaction: {transaction_uid}")

            # Make a POST request to the test-payment endpoint
            response = requests.post(api_url, params={"transaction_uid": transaction_uid})

            if response.status_code == 200:
                response_data = response.json()
                if response_data.get("status") == "success":
                    print(f"  Successfully updated transaction: {transaction_uid}")
                else:
                    print(f"  Failed to update transaction: {transaction_uid}. Reason: {response_data.get('message')}")
            else:
                print(f"  Error calling API for transaction: {transaction_uid}. Status code: {response.status_code}")

    except sqlite3.Error as e:
        print(f"Database error: {e}")
    except requests.RequestException as e:
        print(f"API request error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    update_successful_transactions()
