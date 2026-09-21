# Instructions for Submitting Smart Learning Content (SLCs) to the SLC Catalog

When requesting to add new Smart Learning Content (SLC) items into the catalog, please provide the following details for each activity. 

Submissions can be provided as a **JSON file** (preferred for multiple items), a **Spreadsheet / CSV table**, or a **structured text list**.

---

## 1. Information Required per SLC

### Required Fields

| Field Name | Description | Example / Allowed Values |
| :--- | :--- | :--- |
| **Title** | Concise, descriptive human-readable title. | `"Finding the Maximum in an Array"` |
| **Unique ID / Slug** | Stable, unique identifier for the item (no spaces). | `"codecheck/py-max-in-array"` or `"pcex_nested_loops_02"` |
| **SLC / Activity Type** | The type of learning activity. | Select from: `FreeCodingProblems`, `CodeConstruction`, `BehaviorExample`, `ParsonsProblem`, `CodeCompletionProblem`, `PredictingFinalResult`, `CodeVisualization`, `Question` |
| **Demo URL** | Direct URL to preview and interact with the item in a browser. | `https://example.edu/slc/preview?id=123` |
| **Delivery Details** | How the item is delivered and embedded. Provide protocol and embed URL. | **Protocol:** `HTML` (direct iframe), `SPLICE`, or `LTI 1.1`<br>**URL:** `https://example.edu/slc/embed?id=123` |
| **Provider** | Platform, engine, or tool hosting the activity. | E.g. `PCEX`, `WebEx`, `AnnEx`, `QuizJET`, `QuizPET`, `jsParsons`, `JSVEE`, `CodeCheck`, `PCRS`, `SQL-KnoT`, `DBQA` |
| **Author(s)** | Author full name and institutional affiliation. | **Name:** `Jane Doe`<br>**Affiliation:** `University of Pittsburgh` |
| **Content Language** | Natural language code (BCP-47). | `"en"`, `"es"`, `"bs"`, etc. |
| **Programming Language(s)** | Programming language(s) covered by the activity. | `Python`, `Java`, `C++`, `C`, `SQL`, etc. |
| **License** | Content license. | `MIT`, `CC BY 4.0`, `CC BY-NC-ND 4.0`, etc. |

### Highly Recommended & Optional Fields

| Field Name | Description | Example |
| :--- | :--- | :--- |
| **Prompt / Problem Statement** | Problem description or instructions presented to the learner. | `"Write a function max_val(nums) that returns the largest number in nums."` |
| **Source Code / Snippet** | Reference code, starter template, or code under study. | `def max_val(nums):\n    pass` |
| **Topics / Keywords** | Key programming concepts covered. | `["lists", "loops", "iteration"]` |
| **Difficulty** | Difficulty level. | `novice`, `intermediate`, or `advanced` |
| **Publisher** | Sponsoring organization, publisher, or institution. | `"University of Pittsburgh"` |
| **Learning Objectives** | Concrete learning outcomes. | `["Traverse a 1D array", "Find the maximum element"]` |
| **Prerequisites** | Prior topics, concepts, or item IDs needed. | `["Variables", "For Loops"]` |
| **Status** | Publication status (defaults to `public`). | `public` or `private` |

---

## 2. Accepted Submission Formats

You may submit items in whichever format is most convenient:

### Option A: JSON Format (Preferred)
Provide an array of objects or single objects adhering to this structure:

```json
[
  {
    "title": "Finding the Maximum in an Array",
    "unique_id": "codecheck/py-max-in-array",
    "activity_type": "FreeCodingProblems",
    "demo_url": "https://example.edu/slc/preview?id=123",
    "delivery": [
      {
        "protocol": "HTML",
        "url": "https://example.edu/slc/embed?id=123"
      }
    ],
    "provider": "CodeCheck",
    "authors": [
      {
        "name": "Jane Doe",
        "affiliation": "University of Pittsburgh"
      }
    ],
    "content_language": "en",
    "programming_languages": ["Python"],
    "license": "CC BY-NC-ND 4.0",
    "prompt": "Write a function max_val(nums) that returns the largest number in nums.",
    "source_code": "def max_val(nums):\n    # TODO\n    pass",
    "topics": ["lists", "loops", "max-element"],
    "difficulty": "novice"
  }
]
```
*(A starter template file is available at `template.json`.)*

### Option B: Spreadsheet / CSV Table
If submitting via Google Sheets, Excel, or CSV, use the following columns:

| Column Header | Required? | Example Value |
| :--- | :--- | :--- |
| `title` | **Yes** | Finding the Maximum in an Array |
| `unique_id` | **Yes** | codecheck/py-max-in-array |
| `activity_type` | **Yes** | FreeCodingProblems |
| `demo_url` | **Yes** | https://example.edu/slc/preview?id=123 |
| `delivery_protocol` | **Yes** | HTML |
| `delivery_url` | **Yes** | https://example.edu/slc/embed?id=123 |
| `provider` | **Yes** | CodeCheck |
| `author_name` | **Yes** | Jane Doe |
| `author_affiliation` | **Yes** | University of Pittsburgh |
| `content_language` | **Yes** | en |
| `programming_language` | **Yes** | Python |
| `license` | **Yes** | CC BY-NC-ND 4.0 |
| `prompt` | Recommended | Write a function max_val(nums) that returns the largest number in nums. |
| `source_code` | Optional | def max_val(nums):\n pass |
| `topics` | Optional | lists; loops; max-element (semicolon-separated) |
| `difficulty` | Optional | novice |

*(A starter template file is available at `template.csv`.)*

### Option C: Text Template (for 1–3 items)
```yaml
Title: Finding the Maximum in an Array
Unique ID: codecheck/py-max-in-array
Activity Type: FreeCodingProblems
Demo URL: https://example.edu/slc/preview?id=123
Delivery Protocol: HTML
Delivery URL: https://example.edu/slc/embed?id=123
Provider: CodeCheck
Author: Jane Doe (University of Pittsburgh)
Content Language: en
Programming Language: Python
License: CC BY-NC-ND 4.0
Prompt: Write a function max_val(nums) that returns the largest number in nums.
Source Code: |
  def max_val(nums):
      pass
Topics: lists, loops, max-element
Difficulty: novice
```
