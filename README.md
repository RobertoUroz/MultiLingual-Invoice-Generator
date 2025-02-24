# Multilingual Invoice Generator

The **Multilingual Invoice Generator** is a robust solution designed to create professional invoices in multiple languages and scripts. This project leverages dynamic HTML templates and JSON data to produce PDF invoices that can be rendered offline and later synchronized with a central document storage server. It is especially suited for environments with limited internet connectivity and diverse linguistic needs.

## Features

- **Multilingual Support:**  
  Generate invoices that support multiple alphabets—including Latin, Arabic, Cyrillic, Devanagari, Chinese, and Dravidian—ensuring localized document rendering for global users.

- **Dynamic Template Rendering:**  
  Utilize customizable HTML templates populated with JSON data to dynamically fill in invoice fields, line items, and totals.

- **Offline Capabilities:**  
  Produce and store invoices locally on a mobile device, with an automatic sync process to upload documents once an internet connection is available.

- **Custom Styling & Layout:**  
  Leverage CSS to precisely style and format invoices, including support for headers, footers, page breaks, and dynamic tables.

- **E-Signature Integration:**  
  Capture and embed e-signatures directly into invoices, providing a secure and legally binding digital signing process.

- **Barcode/QR Code Generation:**  
  Enhance invoices with barcodes or QR codes for quick scanning and integration with inventory or tracking systems.

## Technologies Used

- **HTML & CSS:** For designing and styling invoice templates.
- **JavaScript & JSON:** For dynamic data insertion and template manipulation.
- **PDF Rendering Engine:** for converting rendered invoices into PDF format.
- **Offline Storage:** Mechanisms to store generated invoices locally until they can be synchronized.
- **E-Signature & Barcode APIs:** For integrating digital signatures and barcode functionality.
- **Oracle Jet Tooling:** Javascript framework to develop cross-platform apps.
- **Agile Development:** Ensuring iterative improvements and adaptability to user feedback.

## Installation & Setup

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/RobertoUroz/Multilingual-Invoice-Generator.git
   ```

2. **Install Dependencies:**
    - Navigate to the project directory and run:
      ```bash
      ojet install
      ```
   *(Adjust this step if using another dependency management system.)*

3. **Build the Project:**
    - Run the build script:
      ```bash
      ojet build
      ```
    - This will generate the Android APK.

## Usage

- **Generate Invoices:**  
  Launch the application to dynamically render invoices using your chosen template and JSON input data.

- **Offline Operation:**  
  Generated invoices are stored locally on the device, allowing users to work without an internet connection.

- **Synchronization:**  
  When the device is back online, all locally stored invoices (and related metadata) will be automatically synced with a central document storage server.

- **Direct APK Download (Android):**  
  Android users can also download the pre-built APK directly from the `/Output` folder to install and enjoy the app without building it from source.

## Project Structure

- **/src:** Source code responsible for template rendering, PDF generation, and data synchronization.

## Credits & Acknowledgements

- **Developer:** [Roberto Uroz](https://github.com/RobertoUroz)
