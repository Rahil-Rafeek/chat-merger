// ============================================================
// In-Memory Database Layer
// Uses a simple Map-based store for local development.
// Can be replaced with Prisma + PostgreSQL for production.
// ============================================================

import {
  Conversation,
  Message,
  MessageRole,
  User,
} from '@/types';
import { randomUUID } from 'crypto';
const uuidv4 = () => randomUUID();

// --- In-Memory Stores ---
const users: Map<string, User> = new Map();
const conversations: Map<string, Conversation> = new Map();
const messages: Map<string, Message> = new Map();
const mergedConversationSources: Map<string, string[]> = new Map(); // mergedConvId -> sourceConvIds[]

// --- Default Demo User ---
const DEMO_USER_ID = 'user_demo_001';

function ensureDemoUser(): User {
  if (!users.has(DEMO_USER_ID)) {
    const user: User = {
      id: DEMO_USER_ID,
      email: 'demo@chatmerger.app',
      name: 'Demo User',
      createdAt: new Date('2026-09-01'),
    };
    users.set(DEMO_USER_ID, user);
  }
  return users.get(DEMO_USER_ID)!;
}

// --- User Operations ---
export function getUser(userId: string): User | undefined {
  return users.get(userId);
}

export function getUserByEmail(email: string): User | undefined {
  return Array.from(users.values()).find(u => u.email === email);
}

export function createUser(email: string, name: string, passwordHash?: string): User {
  const user: User = {
    id: uuidv4(),
    email,
    name,
    createdAt: new Date(),
  };
  users.set(user.id, user);
  return user;
}

// --- Conversation Operations ---
export function getConversations(userId: string): Conversation[] {
  return Array.from(conversations.values())
    .filter(c => c.userId === userId)
    .map(c => {
      const msgs = getMessagesByConversation(c.id);
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      return {
        ...c,
        messageCount: msgs.length,
        preview: lastMsg ? lastMsg.content.substring(0, 100) : '',
        mergeSourceIds: mergedConversationSources.get(c.id) || undefined,
      };
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export function getConversation(id: string): Conversation | undefined {
  const conv = conversations.get(id);
  if (!conv) return undefined;
  const msgs = getMessagesByConversation(id);
  return {
    ...conv,
    messages: msgs,
    messageCount: msgs.length,
    mergeSourceIds: mergedConversationSources.get(id) || undefined,
  };
}

export function createConversation(
  userId: string,
  title: string,
  isMerged: boolean = false,
  mergeSummary?: string,
  sourceIds?: string[]
): Conversation {
  const conv: Conversation = {
    id: uuidv4(),
    userId,
    title,
    createdAt: new Date(),
    updatedAt: new Date(),
    isMerged,
    mergeSummary: mergeSummary || null,
  };
  conversations.set(conv.id, conv);
  if (isMerged && sourceIds) {
    mergedConversationSources.set(conv.id, sourceIds);
  }
  return conv;
}

export function updateConversation(id: string, updates: Partial<Conversation>): Conversation | undefined {
  const conv = conversations.get(id);
  if (!conv) return undefined;
  const updated = { ...conv, ...updates, updatedAt: new Date() };
  conversations.set(id, updated);
  return updated;
}

export function deleteConversation(id: string): boolean {
  // Delete all messages in the conversation
  const msgs = getMessagesByConversation(id);
  msgs.forEach(m => messages.delete(m.id));
  // Remove merge sources
  mergedConversationSources.delete(id);
  return conversations.delete(id);
}

export function duplicateConversation(id: string, userId: string): Conversation | undefined {
  const original = getConversation(id);
  if (!original) return undefined;
  
  const newConv = createConversation(userId, `${original.title} (Copy)`);
  const msgs = getMessagesByConversation(id);
  msgs.forEach(m => {
    addMessage(newConv.id, m.role, m.content);
  });
  return getConversation(newConv.id);
}

// --- Message Operations ---
export function getMessagesByConversation(conversationId: string): Message[] {
  return Array.from(messages.values())
    .filter(m => m.conversationId === conversationId)
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
}

export function addMessage(
  conversationId: string,
  role: MessageRole,
  content: string,
  metadata?: { sourceChatId?: string; sourceMessageIds?: string[] }
): Message {
  const msgs = getMessagesByConversation(conversationId);
  const seqNum = msgs.length > 0 ? msgs[msgs.length - 1].sequenceNumber + 1 : 1;
  
  const message: Message = {
    id: uuidv4(),
    conversationId,
    role,
    content,
    createdAt: new Date(),
    sequenceNumber: seqNum,
    metadata,
  };
  messages.set(message.id, message);
  
  // Update conversation's updatedAt
  const conv = conversations.get(conversationId);
  if (conv) {
    conv.updatedAt = new Date();
    conversations.set(conversationId, conv);
  }
  
  return message;
}

export function getMessage(id: string): Message | undefined {
  return messages.get(id);
}

// --- Merge Operations ---
export function getMergeSources(conversationId: string): string[] {
  return mergedConversationSources.get(conversationId) || [];
}

export function getSourceConversations(mergedConversationId: string): Conversation[] {
  const sourceIds = getMergeSources(mergedConversationId);
  return sourceIds
    .map(id => getConversation(id))
    .filter((c): c is Conversation => c !== undefined);
}

// --- Search ---
export function searchConversations(userId: string, query: string): Conversation[] {
  const q = query.toLowerCase();
  const userConvs = getConversations(userId);
  
  return userConvs.filter(conv => {
    // Search in title
    if (conv.title.toLowerCase().includes(q)) return true;
    // Search in messages
    const msgs = getMessagesByConversation(conv.id);
    return msgs.some(m => m.content.toLowerCase().includes(q));
  });
}

// --- Seed Data ---
export function seedDatabase(): void {
  const user = ensureDemoUser();
  
  // Skip if already seeded
  if (getConversations(user.id).length > 0) return;

  // --- Conversation 1: AI Internship Preparation ---
  const conv1 = createConversation(user.id, 'AI Internship Preparation');
  conv1.createdAt = new Date('2026-09-20T10:00:00');
  conv1.updatedAt = new Date('2026-09-20T11:30:00');
  conversations.set(conv1.id, conv1);

  const conv1Messages: [MessageRole, string][] = [
    ['user', 'I want to prepare for an AI/ML internship at a top tech company. What should I focus on?'],
    ['assistant', `Great choice! For an AI/ML internship, you should focus on several key areas:

1. **Machine Learning Fundamentals**: Understand supervised, unsupervised, and reinforcement learning
2. **Deep Learning**: Neural networks, CNNs, RNNs, Transformers
3. **Mathematics**: Linear algebra, probability, statistics, calculus
4. **Programming**: Python is essential, along with libraries like NumPy, Pandas, Scikit-learn
5. **Frameworks**: PyTorch or TensorFlow
6. **Projects**: Build 2-3 solid projects showcasing your skills
7. **Research Papers**: Read and understand key papers in your area of interest

Would you like me to dive deeper into any of these areas?`],
    ['user', 'Yes, I want to use Python as my primary language. Should I also learn PyTorch or TensorFlow?'],
    ['assistant', `Since you're going with Python (excellent choice!), here's my recommendation:

**PyTorch** is generally preferred for:
- Research and academia
- More Pythonic and intuitive API
- Dynamic computation graphs
- Growing rapidly in industry adoption

**TensorFlow** is strong for:
- Production deployment
- Mobile/edge deployment (TFLite)
- Industry adoption (especially Google ecosystem)

For internship preparation, I'd recommend **starting with PyTorch** because:
- Most research papers use PyTorch
- Easier to learn and debug
- Interview coding questions are often easier in PyTorch
- You can always learn TensorFlow later

Focus on implementing common architectures from scratch to show deep understanding.`],
    ['user', 'What kind of projects should I build for my portfolio?'],
    ['assistant', `Here are project ideas that will impress internship interviewers:

1. **Image Classification with Transfer Learning**
   - Use a pre-trained ResNet/EfficientNet
   - Fine-tune on a custom dataset
   - Deploy with a simple web interface

2. **Natural Language Processing**
   - Sentiment analysis using Transformers
   - Text summarization
   - Build a chatbot

3. **Computer Vision**
   - Object detection using YOLO
   - Image segmentation

4. **Recommendation System**
   - Collaborative filtering
   - Content-based recommendations

5. **Time Series Forecasting**
   - Stock price prediction
   - Weather forecasting

I'd recommend picking 2-3 from different domains to show breadth. Make sure each project:
- Has clean, well-documented code
- Includes a README with results
- Is deployed or has a demo
- Shows understanding of evaluation metrics`],
    ['user', 'I think I\'ll focus on NLP and Computer Vision. Those seem most relevant.'],
    ['assistant', `Excellent choices! NLP and Computer Vision are the two most in-demand areas for AI/ML internships.

**For NLP, prioritize:**
- Understanding Transformer architecture
- Hands-on with Hugging Face library
- Fine-tuning BERT/GPT models
- Text preprocessing and tokenization

**For Computer Vision, prioritize:**
- CNN architectures (ResNet, EfficientNet)
- Transfer learning techniques
- Data augmentation
- Object detection frameworks

**Timeline suggestion (8 weeks):**
- Weeks 1-2: Strengthen Python + ML fundamentals
- Weeks 3-4: Deep dive into NLP, build project
- Weeks 5-6: Deep dive into CV, build project
- Weeks 7-8: Polish projects, practice interviews

Keep your GitHub updated and write blog posts about your learnings!`],
  ];

  conv1Messages.forEach(([role, content]) => {
    addMessage(conv1.id, role, content);
  });

  // --- Conversation 2: Python Interview Preparation ---
  const conv2 = createConversation(user.id, 'Python Interview Preparation');
  conv2.createdAt = new Date('2026-09-21T14:00:00');
  conv2.updatedAt = new Date('2026-09-21T16:00:00');
  conversations.set(conv2.id, conv2);

  const conv2Messages: [MessageRole, string][] = [
    ['user', 'Help me prepare for Python coding interviews. I prefer Python for all my development work.'],
    ['assistant', `Let's get you ready for Python interviews! Here's a structured approach:

## Core Python Concepts to Master

1. **Data Structures**
   - Lists, Tuples, Sets, Dictionaries
   - Collections module (defaultdict, Counter, deque)
   - Heaps (heapq module)

2. **OOP Concepts**
   - Classes, Inheritance, Polymorphism
   - Decorators and Descriptors
   - Magic/Dunder methods
   - Abstract Base Classes

3. **Advanced Python**
   - Generators and Iterators
   - Context Managers
   - Metaclasses
   - Type Hints

4. **DSA in Python**
   - Arrays and Strings
   - Linked Lists
   - Trees and Graphs
   - Dynamic Programming
   - Sorting and Searching

Would you like to start with any specific area?`],
    ['user', 'Let\'s start with common coding patterns. I want to keep my answers concise in interviews.'],
    ['assistant', `Great mindset! Concise answers show confidence. Here are the most common patterns:

## Sliding Window
\`\`\`python
def max_sum_subarray(arr, k):
    window_sum = sum(arr[:k])
    max_sum = window_sum
    for i in range(k, len(arr)):
        window_sum += arr[i] - arr[i-k]
        max_sum = max(max_sum, window_sum)
    return max_sum
\`\`\`

## Two Pointers
\`\`\`python
def two_sum_sorted(arr, target):
    left, right = 0, len(arr) - 1
    while left < right:
        curr = arr[left] + arr[right]
        if curr == target:
            return [left, right]
        elif curr < target:
            left += 1
        else:
            right -= 1
\`\`\`

## Hash Map Pattern
\`\`\`python
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
\`\`\`

These three patterns alone cover 40%+ of interview questions!`],
    ['user', 'What about Python-specific interview questions? Not just DSA but Python language questions.'],
    ['assistant', `Here are frequently asked Python-specific questions:

## 1. Mutable vs Immutable
\`\`\`python
# Gotcha: default mutable arguments
def bad_append(item, lst=[]):  # Bug!
    lst.append(item)
    return lst

def good_append(item, lst=None):  # Correct
    if lst is None:
        lst = []
    lst.append(item)
    return lst
\`\`\`

## 2. List Comprehension vs Generator
\`\`\`python
# List comp: creates full list in memory
squares = [x**2 for x in range(1000000)]

# Generator: lazy evaluation
squares_gen = (x**2 for x in range(1000000))
\`\`\`

## 3. GIL (Global Interpreter Lock)
- CPython has a GIL that prevents true multi-threading for CPU-bound tasks
- Use multiprocessing for CPU-bound work
- Threading is fine for I/O-bound work

## 4. Decorators
\`\`\`python
import functools

def timer(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        import time
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {time.time()-start:.4f}s")
        return result
    return wrapper
\`\`\`

## 5. Context Managers
\`\`\`python
from contextlib import contextmanager

@contextmanager
def managed_resource():
    resource = acquire()
    try:
        yield resource
    finally:
        release(resource)
\`\`\`

These questions test your Python depth beyond just algorithms!`],
    ['user', 'Should I use Java instead of Python for interviews? Some people say Java is better.'],
    ['assistant', `This is a common debate. Here's my honest take:

**Stick with Python.** Here's why:

1. **Speed of coding**: Python lets you write solutions 2-3x faster
2. **Readability**: Interviewers can follow your Python code more easily
3. **Built-in data structures**: Dictionaries, sets, and list comprehensions are powerful
4. **AI/ML focus**: Since you're targeting AI internships, Python is THE language
5. **Industry standard**: Most AI/ML codebases use Python

**When Java might be better:**
- System design roles at specific companies
- Android development
- Enterprise backend roles

Since you already prefer Python and are targeting AI/ML roles, **don't switch**. Your time is better spent deepening Python knowledge than learning a new language.

**Pro tip:** Learn Python's standard library well — collections, itertools, functools, and typing modules will save you time in interviews.`],
  ];

  conv2Messages.forEach(([role, content]) => {
    addMessage(conv2.id, role, content);
  });

  // --- Conversation 3: SQL Interview Preparation ---
  const conv3 = createConversation(user.id, 'SQL Interview Preparation');
  conv3.createdAt = new Date('2026-09-22T09:00:00');
  conv3.updatedAt = new Date('2026-09-22T11:00:00');
  conversations.set(conv3.id, conv3);

  const conv3Messages: [MessageRole, string][] = [
    ['user', 'I need to prepare SQL for data science and AI internship interviews. What are the most important topics?'],
    ['assistant', `SQL is crucial for AI/data roles! Here are the key topics:

## Must-Know SQL Concepts

### 1. Basic Queries
- SELECT, WHERE, ORDER BY, GROUP BY, HAVING
- JOINs (INNER, LEFT, RIGHT, FULL OUTER, CROSS)
- Subqueries and CTEs (Common Table Expressions)

### 2. Window Functions (Very Important!)
\`\`\`sql
-- Ranking
ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC)
RANK() OVER (ORDER BY score DESC)
DENSE_RANK() OVER (ORDER BY score DESC)

-- Running totals
SUM(amount) OVER (ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)

-- Lead/Lag
LAG(salary, 1) OVER (ORDER BY hire_date)
LEAD(salary, 1) OVER (ORDER BY hire_date)
\`\`\`

### 3. Aggregations
- COUNT, SUM, AVG, MIN, MAX
- GROUP BY with HAVING
- Conditional aggregation (CASE WHEN)

### 4. Advanced
- Self joins
- Recursive CTEs
- Pivot/Unpivot
- String functions
- Date functions

Would you like practice problems?`],
    ['user', 'Yes, give me some practice problems that are commonly asked in interviews.'],
    ['assistant', `Here are classic SQL interview problems:

## Problem 1: Second Highest Salary
\`\`\`sql
-- Method 1: Subquery
SELECT MAX(salary) as second_highest
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);

-- Method 2: Window function
SELECT salary
FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) as rnk
  FROM employees
) ranked
WHERE rnk = 2;
\`\`\`

## Problem 2: Consecutive Days Login
\`\`\`sql
WITH ranked AS (
  SELECT user_id, login_date,
    login_date - ROW_NUMBER() OVER (
      PARTITION BY user_id ORDER BY login_date
    ) * INTERVAL '1 day' as grp
  FROM logins
)
SELECT user_id, COUNT(*) as consecutive_days
FROM ranked
GROUP BY user_id, grp
HAVING COUNT(*) >= 3;
\`\`\`

## Problem 3: Department Top Salaries
\`\`\`sql
WITH ranked AS (
  SELECT e.name, d.name as department, e.salary,
    DENSE_RANK() OVER (PARTITION BY d.id ORDER BY e.salary DESC) as rnk
  FROM employees e
  JOIN departments d ON e.dept_id = d.id
)
SELECT department, name, salary
FROM ranked WHERE rnk <= 3;
\`\`\`

Practice these patterns — they cover 70% of SQL interview questions!`],
    ['user', 'I want to use PostgreSQL specifically. Is that a good choice for data work?'],
    ['assistant', `**PostgreSQL is an excellent choice!** It's actually the gold standard for data work. Here's why:

### Why PostgreSQL for Data/AI Work

1. **Advanced Analytics**
   - Full window function support
   - Array and JSON operations
   - Full-text search built-in
   - Statistical aggregate functions

2. **Data Types**
   - Arrays, JSON/JSONB
   - Range types
   - UUID
   - Custom types

3. **Performance**
   - Sophisticated query optimizer
   - Parallel query execution
   - Partial indexes
   - Table partitioning

4. **Extensions**
   - PostGIS for geospatial data
   - pgvector for vector/embedding search (great for AI!)
   - TimescaleDB for time series

5. **Industry Adoption**
   - Used by most startups and many large companies
   - Standard in data engineering
   - Growing in AI/ML pipelines

**PostgreSQL-specific features to know:**
\`\`\`sql
-- JSONB operations
SELECT data->>'name' FROM users WHERE data @> '{"role": "admin"}';

-- Array operations
SELECT * FROM products WHERE tags @> ARRAY['ml', 'python'];

-- Full-text search
SELECT * FROM articles WHERE to_tsvector(content) @@ to_tsquery('machine & learning');
\`\`\`

You made a great choice!`],
  ];

  conv3Messages.forEach(([role, content]) => {
    addMessage(conv3.id, role, content);
  });

  // --- Conversation 4: Machine Learning Project ---
  const conv4 = createConversation(user.id, 'Machine Learning Project');
  conv4.createdAt = new Date('2026-09-23T15:00:00');
  conv4.updatedAt = new Date('2026-09-23T17:00:00');
  conversations.set(conv4.id, conv4);

  const conv4Messages: [MessageRole, string][] = [
    ['user', 'I\'m starting a machine learning project for my portfolio. I want to build a sentiment analysis system. What tech stack should I use?'],
    ['assistant', `A sentiment analysis project is a great portfolio piece! Here's my recommended tech stack:

## Tech Stack

### Core ML
- **Language**: Python 3.10+
- **ML Framework**: PyTorch (or TensorFlow if you prefer)
- **NLP Library**: Hugging Face Transformers
- **Pre-trained Model**: BERT or DistilBERT for fine-tuning

### Data Processing
- **Pandas**: Data manipulation
- **NumPy**: Numerical operations
- **NLTK/spaCy**: Text preprocessing

### API/Deployment
- **FastAPI**: REST API for serving predictions
- **Docker**: Containerization
- **Streamlit/Gradio**: Quick demo UI

### Dataset
- **IMDB Reviews**: 50k reviews, balanced sentiment
- **Twitter Sentiment**: Real-world social media data
- **Amazon Reviews**: Multi-class sentiment

## Project Structure
\`\`\`
sentiment-analysis/
├── data/
├── models/
├── notebooks/
│   ├── 01_eda.ipynb
│   ├── 02_preprocessing.ipynb
│   └── 03_training.ipynb
├── src/
│   ├── data_loader.py
│   ├── model.py
│   ├── train.py
│   ├── evaluate.py
│   └── predict.py
├── api/
│   └── main.py
├── requirements.txt
└── README.md
\`\`\`

Shall I help you get started with the implementation?`],
    ['user', 'Yes! Let\'s use TensorFlow instead of PyTorch. I changed my mind since TensorFlow has better deployment options.'],
    ['assistant', `No problem! TensorFlow is a solid choice, especially for deployment. Here's the updated plan:

## Why TensorFlow Works Well Here

1. **TF Serving**: Production-ready model serving
2. **TFLite**: Mobile deployment
3. **TF.js**: Browser deployment
4. **SavedModel**: Easy export format

## Getting Started

### Step 1: Install Dependencies
\`\`\`bash
pip install tensorflow tensorflow-hub tensorflow-text
pip install pandas numpy scikit-learn
pip install transformers  # For easy model access
\`\`\`

### Step 2: Data Loading
\`\`\`python
import tensorflow as tf
import tensorflow_hub as hub

# Load IMDB dataset
(train_data, test_data), info = tf.keras.datasets.imdb.load_data(
    num_words=10000
)
\`\`\`

### Step 3: Model Architecture
\`\`\`python
model = tf.keras.Sequential([
    tf.keras.layers.Embedding(10000, 128),
    tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(64)),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dropout(0.5),
    tf.keras.layers.Dense(1, activation='sigmoid')
])

model.compile(
    optimizer='adam',
    loss='binary_crossentropy',
    metrics=['accuracy']
)
\`\`\`

Note: This contradicts your earlier choice of PyTorch in our AI internship discussion, but it's perfectly fine to use different tools for different projects!

Shall I continue with the training pipeline?`],
    ['user', 'Actually, let me think about this more. I\'m not sure if I should use PyTorch or TensorFlow. I previously said I\'d use PyTorch but now I\'m considering TensorFlow. What do you think?'],
    ['assistant', `This is a common dilemma! Let me give you a balanced view:

## The Decision Framework

| Factor | PyTorch | TensorFlow |
|--------|---------|------------|
| Learning curve | Easier | Steeper |
| Debugging | Better (eager mode) | Improved in TF2 |
| Research | Industry standard | Still used |
| Deployment | Improving (TorchServe) | Excellent (TF Serving) |
| Mobile | PyTorch Mobile | TFLite (mature) |
| Community | Growing fast | Large, established |
| Job market | Very strong in AI/ML | Strong overall |

## My Recommendation

For your situation (AI/ML internship + portfolio):

**Go with PyTorch** because:
1. You already started learning it
2. Most AI/ML internship interviews expect PyTorch
3. Research papers predominantly use PyTorch
4. The gap in deployment is closing

**Use TensorFlow** for:
- A separate deployment-focused project
- If a specific company you're targeting uses it

**Best strategy**: Master one deeply, have working knowledge of both.

Don't waste time going back and forth — pick one and build great projects!`],
  ];

  conv4Messages.forEach(([role, content]) => {
    addMessage(conv4.id, role, content);
  });

  // --- Conversation 5: Resume Discussion ---
  const conv5 = createConversation(user.id, 'Resume Discussion');
  conv5.createdAt = new Date('2026-09-24T10:00:00');
  conv5.updatedAt = new Date('2026-09-24T12:00:00');
  conversations.set(conv5.id, conv5);

  const conv5Messages: [MessageRole, string][] = [
    ['user', 'Help me write my resume for AI/ML internship applications. I\'m a 3rd-year computer science student.'],
    ['assistant', `Let me help you create a strong AI/ML internship resume! Here's a template:

## Resume Structure

### 1. Header
- Full name
- Email | Phone | LinkedIn | GitHub
- Portfolio/Personal website

### 2. Education
**B.Tech in Computer Science** | Your University
Expected Graduation: 2027
GPA: X.XX/10 (include if above 8)
Relevant Coursework: ML, Deep Learning, Statistics, Linear Algebra, Data Structures

### 3. Skills Section
\`\`\`
Languages: Python, SQL, C++
ML/DL: PyTorch, Scikit-learn, NumPy, Pandas
Tools: Git, Docker, Jupyter, VS Code
Cloud: AWS/GCP (if applicable)
Databases: PostgreSQL, MongoDB
\`\`\`

### 4. Projects (Most Important Section!)
For each project include:
- **Project Name** | Technologies used
  - 2-3 bullet points using STAR format
  - Quantify results: "Achieved 94% accuracy on..."
  - Show impact: "Reduced inference time by 40%"

### 5. Experience (if any)
- Internships, TA positions, research assistant roles

### 6. Certifications & Achievements
- Online courses, competitions, hackathons

Want me to help you write specific bullet points?`],
    ['user', 'Yes. I have a sentiment analysis project and a computer vision project. Help me write bullet points.'],
    ['assistant', `Here are strong bullet points for your projects:

## Project 1: Sentiment Analysis System

**Sentiment Analysis Engine** | Python, PyTorch, Hugging Face, FastAPI
- Developed a sentiment analysis system using fine-tuned **DistilBERT** achieving **91.2% accuracy** on IMDB review dataset (50K reviews)
- Implemented data preprocessing pipeline handling tokenization, padding, and augmentation for **25% improvement** over baseline LSTM model
- Built a **REST API** using FastAPI for real-time predictions with <100ms latency and deployed using Docker on AWS EC2

## Project 2: Computer Vision

**Object Detection System** | Python, PyTorch, OpenCV, YOLOv8
- Built a real-time object detection system using **YOLOv8** capable of detecting 20+ object categories with **mAP of 0.87**
- Created custom dataset of 5,000 annotated images using **LabelStudio** and implemented data augmentation pipeline
- Optimized model for edge deployment, reducing inference time from 120ms to **45ms** while maintaining 95% of original accuracy

## Tips for Your Bullet Points:
1. Start with a **strong action verb** (Developed, Implemented, Built, Designed)
2. Include **specific technologies**
3. **Quantify everything** (accuracy, speed, dataset size)
4. Show **impact** (improvement over baseline)
5. Keep each bullet to 1-2 lines

These are realistic numbers — adjust based on your actual results!`],
    ['user', 'My resume should be one page only, right? And should I include my coursework?'],
    ['assistant', `**Yes, one page only!** Here are the rules:

## Resume Length
- **Interns/Students**: 1 page (strict)
- **1-5 years experience**: 1 page preferred
- **5+ years**: 1-2 pages acceptable

## Should You Include Coursework?
**Yes**, but be strategic:

✅ **Include these courses:**
- Machine Learning
- Deep Learning
- Artificial Intelligence
- Data Structures & Algorithms
- Statistical Methods
- Linear Algebra
- Database Systems

❌ **Don't include these:**
- Basic programming courses
- English/Communication
- Physics/Chemistry
- Generic electives

## One-Page Tips
1. Use **0.5-0.7 inch margins** (not the default 1 inch)
2. Font size: **10-11pt** for body, **12-14pt** for name
3. Remove the "Objective" section — it's outdated
4. Only list **2-3 projects** (your best ones)
5. Keep skills section concise — one line per category
6. Remove high school achievements
7. Use **single spacing** with small gaps between sections

The key is quality over quantity. 2-3 strong projects beat 5 mediocre ones.`],
  ];

  conv5Messages.forEach(([role, content]) => {
    addMessage(conv5.id, role, content);
  });

  // --- Conversation 6: HR Interview Preparation ---
  const conv6 = createConversation(user.id, 'HR Interview Preparation');
  conv6.createdAt = new Date('2026-09-25T13:00:00');
  conv6.updatedAt = new Date('2026-09-25T14:30:00');
  conversations.set(conv6.id, conv6);

  const conv6Messages: [MessageRole, string][] = [
    ['user', 'I have HR interviews coming up for AI internships. How should I prepare?'],
    ['assistant', `HR interviews for tech internships are more important than many think! Here's how to prepare:

## Common HR Questions & Strategies

### 1. "Tell me about yourself" (90% chance this is asked)
**Structure:** Present → Past → Future
> "I'm a 3rd-year CS student passionate about AI and machine learning. I've built projects in NLP and computer vision using Python and PyTorch. I'm looking for an internship where I can apply my ML skills to real-world problems."

### 2. "Why this company?"
- Research the company's AI initiatives
- Mention specific products/projects
- Align with your interests

### 3. "What's your biggest strength?"
- Pick something relevant (problem-solving, fast learner, attention to detail)
- Back it up with a specific example

### 4. "What's your biggest weakness?"
- Choose something genuine but not critical
- Show how you're working on it
- "I sometimes spend too much time perfecting code, but I've learned to set time limits and prioritize shipping working solutions."

### 5. "Where do you see yourself in 5 years?"
- Show ambition but be realistic
- Connect to the company's mission
- "I see myself as an ML engineer working on production AI systems, contributing to impactful products."

Would you like me to help you practice with mock questions?`],
    ['user', 'Yes, and also tell me what NOT to do in HR interviews.'],
    ['assistant', `## Common HR Interview Mistakes to AVOID

### ❌ Don't Do These:

1. **Don't badmouth previous employers/professors**
   - Even if they were terrible
   - Focus on what you learned instead

2. **Don't say "I don't have any weaknesses"**
   - This is arrogant and shows low self-awareness
   - Always have a genuine answer ready

3. **Don't give generic answers**
   - "I'm a hard worker" → Everyone says this
   - Instead: "I built a sentiment analysis system in 2 weeks while managing my coursework, which taught me to prioritize tasks effectively"

4. **Don't ask about salary first**
   - Wait until they bring it up
   - Or ask at the end when offered

5. **Don't lie about your skills**
   - They WILL ask follow-up questions
   - It's okay to say "I have basic knowledge of X and I'm eager to learn more"

6. **Don't forget to ask questions**
   Always prepare 2-3 questions:
   - "What does a typical day look like for an intern?"
   - "What technologies does the AI team use?"
   - "What mentorship opportunities are available?"

7. **Don't be late**
   - Join 5 minutes early for virtual interviews
   - 10 minutes early for in-person

8. **Don't ramble**
   - Keep answers to 1-2 minutes
   - Use the STAR method for behavioral questions
   - Practice being **concise** — this was mentioned as important in your preparation goals

### ✅ Do These Instead:
- Research the company thoroughly
- Prepare specific examples from your projects
- Show enthusiasm for the role
- Follow up with a thank-you email within 24 hours`],
    ['user', 'What if they ask about my technical preferences? Should I mention Java or Python?'],
    ['assistant', `Great question! Here's how to handle technical preference questions:

## The Right Approach

**Always be honest, but strategic:**

Since you're applying for **AI/ML internships**, emphasize:

> "My primary language is **Python** because it's the industry standard for AI/ML work. I'm proficient with PyTorch and the scientific Python ecosystem including NumPy, Pandas, and Scikit-learn."

### What if they ask about other languages?

If the company uses Java:
> "While Python is my strongest language for ML work, I have experience with Java and I'm comfortable picking up new languages quickly."

If they ask about C++:
> "I understand the importance of C++ for performance-critical ML applications and I have foundational knowledge. I'm eager to deepen my C++ skills."

### Key Tips:
1. **Lead with your strengths** (Python for AI roles)
2. **Show willingness to learn** other languages
3. **Don't claim expertise you don't have**
4. **Connect your language choice to the role**

### Don't:
- Say "I only know Python and nothing else"
- Claim expertise in 10 languages
- Debate which language is "best" — it depends on context

Remember: For AI/ML roles, Python proficiency is expected and valued. Don't overthink this!`],
  ];

  conv6Messages.forEach(([role, content]) => {
    addMessage(conv6.id, role, content);
  });
}

// Initialize seed data
seedDatabase();

export { DEMO_USER_ID };
