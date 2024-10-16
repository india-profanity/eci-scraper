import os
import json
import base64
import time
import asyncio
import aiohttp
from typing import List, Dict, Any
from colorama import Fore, Style, init
from concurrent.futures import ThreadPoolExecutor, as_completed

# Initialize colorama for cross-platform colored output
init(autoreset=True)

# Constants
STATES_DIR = os.path.join('output', 'metadata', 'states')
CAPTCHA_URL = 'http://localhost:8000/generate_and_solve_captchas'
DOWNLOAD_PDF_URL = 'https://gateway-voters.eci.gov.in/api/v1/printing-publish/generate-published-geroll'
GET_LANGUAGES_URL = 'https://gateway-voters.eci.gov.in/api/v1/printing-publish/get-ac-languages'
MAX_THREADS = 4  # Adjust this based on your system's capabilities
PARTS_PER_THREAD = 40  # Number of parts to process in each thread

# Global array to store failed requests
failed_requests = []

async def download_pdf(session: aiohttp.ClientSession, part_payload: Dict[str, Any]) -> None:
    try:
        async with session.post(CAPTCHA_URL, json={"count": 10}) as response:
            captchas = (await response.json())['captchas']
        
        print(f"Received {len(captchas)} captchas")

        for captcha in captchas:
            try:
                payload_with_captcha = {
                    **part_payload,
                    "captcha": captcha['value'],
                    "captchaId": captcha['id'],
                }
                print(f"Attempting download with captcha: {captcha['value']}")
                await download_and_save_pdf(session, payload_with_captcha, DOWNLOAD_PDF_URL)
                print(f"Successfully downloaded PDF with captcha: {captcha['value']}")
                return
            except Exception as error:
                print(f"Captcha {captcha['value']} failed with error: {error}")
                print("Trying the next one.")
        
        print("All captchas failed. Unable to download PDF.")
        failed_requests.append({
            "part": part_payload,
            "error": "All captchas failed"
        })
    except Exception as e:
        print(f"Error in download_pdf function: {e}")
        failed_requests.append({
            "part": part_payload,
            "error": str(e)
        })

async def download_and_save_pdf(session: aiohttp.ClientSession, payload: Dict[str, Any], url: str) -> None:
    async with session.post(url, json=payload) as response:
        data = await response.json()
        base64_file = data.get('file')

        if not base64_file:
            raise ValueError('No file found in the response')

        file_name = f"{payload['stateCd']}_district{payload['districtCd']}_ac{payload['acNumber']}_part{payload['partNumber']}{'_supplement' if payload.get('isSupplement') else ''}_{int(time.time())}.pdf"
        pdf_directory = os.path.join('output', 'metadata', 'states', payload['stateCd'], 'pdfs')
        await decode_and_save_pdf(base64_file, file_name, pdf_directory)

        print(f"PDF saved: {file_name}")

async def process_parts(session: aiohttp.ClientSession, parts: List[Dict[str, Any]]) -> None:
    for part in parts:
        print(part)
        part_dict = dict(part)
        if not isinstance(part_dict, dict):
            raise ValueError(f"Expected 'part' to be a dictionary, but got {type(part_dict)}")
        print(Fore.RED + str(part['partNumber']))
        part = part_dict
        print(Fore.RED + str(part['partNumber']))
        try:
            async with session.post(GET_LANGUAGES_URL, json={
                "stateCd": part['stateCd'],
                "districtCd": part['districtCd'],
                "acNumber": part['acNumber'],
            }) as response:
                languages = (await response.json())['payload']

            lang_cd = next((l for l in languages if l in ['HIN', 'ENG']), languages[0])

            start_time = time.time()
            await download_pdf(session, {**part, 'langCd': lang_cd})
            end_time = time.time()
            print(Fore.BLUE + f"Time taken to download PDF for part {part['partNumber']}: {end_time - start_time:.2f} seconds")
        except Exception as error:
            print(Fore.RED + f"Failed to download for part {part['partNumber']}: {error}")
            failed_requests.append({
                "part": part,
                "error": str(error)
            })

async def process_state_data(state_data: Dict[str, Any]) -> None:
    state_name = state_data['stateName']
    districts = state_data['districts']
    all_constituencies = [ac for district in districts for ac in district['acs']]
    all_parts = [part for constituency in all_constituencies for part in constituency['parts']]

    with open(os.path.join('output', 'metadata', 'states', state_data['stateCd'], 'parts.json'), 'w') as f:
        json.dump(all_parts, f, indent=2)

    print(f"Processing state: {state_name}")

    # Split parts into chunks for each thread
    part_chunks = [all_parts[i:i + PARTS_PER_THREAD] for i in range(0, len(all_parts), PARTS_PER_THREAD)]

    async def process_chunk(chunk):
        async with aiohttp.ClientSession() as session:
            await process_parts(session, chunk)

    # Create tasks for each chunk
    tasks = [asyncio.create_task(process_chunk(chunk)) for chunk in part_chunks]

    # Wait for all tasks to complete
    await asyncio.gather(*tasks)

    print(f"Finished processing state: {state_name}")

def thread_function(state_json_path: str) -> None:
    try:
        with open(state_json_path, 'r') as f:
            state_data = json.load(f)
        asyncio.run(process_state_data(state_data))
    except Exception as err:
        print(Fore.RED + f"Error processing {state_json_path}: {err}")

def process_states() -> None:
    with ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
        futures = []
        for folder in os.listdir(STATES_DIR):
            if folder == '.DS_Store':
                continue
            state_json_path = os.path.join(STATES_DIR, folder, 'state.json')
            futures.append(executor.submit(thread_function, state_json_path))

        for future in as_completed(futures):
            future.result()  # This will raise any exceptions that occurred in the thread

    # After all states are processed, write failed requests to a JSON file
    with open('failed_requests.json', 'w') as f:
        json.dump(failed_requests, f, indent=2)
    
    print(f"Total failed requests: {len(failed_requests)}")
    print("Failed requests have been written to failed_requests.json")

async def decode_and_save_pdf(base64_string: str, file_name: str, output_directory: str) -> None:
    try:
        if not base64_string.strip():
            raise ValueError('Invalid base64String')
        if not file_name.strip():
            raise ValueError('Invalid fileName')
        if not output_directory.strip():
            raise ValueError('Invalid outputDirectory')

        sanitized_file_name = os.path.basename(file_name)
        absolute_output_dir = os.path.abspath(output_directory)

        if not os.path.abspath(absolute_output_dir).startswith(os.path.abspath(output_directory)):
            raise ValueError('Invalid output directory path')

        pdf_bytes = base64.b64decode(base64_string)
        file_path = os.path.join(absolute_output_dir, sanitized_file_name)

        os.makedirs(absolute_output_dir, exist_ok=True)
        with open(file_path, 'xb') as f:
            f.write(pdf_bytes)

        print(Fore.GREEN + f"PDF saved successfully: {file_path}")
    except Exception as error:
        print(Fore.RED + f"Error saving PDF: {error}")
        raise

if __name__ == "__main__":
    process_states()