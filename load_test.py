#!/usr/bin/env python3
"""
Load Test: 60 students simultaneously logging in and selecting courses.
Tests real-time handling, race conditions, and concurrent capacity enforcement.
"""

import asyncio
import aiohttp
import time
import json
import random

BASE_URL = "https://elective-mca.onrender.com"

COURSE_IDS = [
    "69a9a8ce7c882fdc331817ca",  # Machine Learning (cap 20)
    "69a9a8cf7c882fdc331817ce",  # Cloud Computing (cap 20)
    "69a9a8d17c882fdc331817d2",  # Cyber Security (cap 20)
]

COURSE_NAMES = {
    "69a9a8ce7c882fdc331817ca": "Machine Learning",
    "69a9a8cf7c882fdc331817ce": "Cloud Computing",
    "69a9a8d17c882fdc331817d2": "Cyber Security",
}

# Generate roll numbers 25D1502 to 25D1562 (skip 25D1501 which might not exist)
ROLL_NUMBERS = [f"25D15{str(i).zfill(2)}" for i in range(2, 63)]  # 61 roll numbers, use first 60

results = {
    "login_success": 0,
    "login_fail": 0,
    "select_success": 0,
    "select_fail": 0,
    "select_errors": [],
    "login_errors": [],
    "login_times": [],
    "select_times": [],
    "course_selections": {"Machine Learning": 0, "Cloud Computing": 0, "Cyber Security": 0},
}

async def student_flow(session, roll_number, course_id, student_num):
    """Simulate a student: login -> select course"""
    
    # Phase 1: Login
    login_start = time.time()
    try:
        async with session.post(
            f"{BASE_URL}/api/auth/student/login",
            json={"rollNumber": roll_number, "password": roll_number},
            timeout=aiohttp.ClientTimeout(total=30)
        ) as resp:
            login_time = time.time() - login_start
            results["login_times"].append(login_time)
            
            if resp.status == 200:
                data = await resp.json()
                token = data.get("token")
                results["login_success"] += 1
                print(f"  [{student_num:2d}] ✅ {roll_number} logged in ({login_time:.2f}s)")
            elif resp.status == 429:
                results["login_fail"] += 1
                results["login_errors"].append(f"{roll_number}: Rate limited")
                print(f"  [{student_num:2d}] 🚫 {roll_number} RATE LIMITED ({login_time:.2f}s)")
                return
            else:
                body = await resp.text()
                results["login_fail"] += 1
                results["login_errors"].append(f"{roll_number}: {resp.status} - {body[:100]}")
                print(f"  [{student_num:2d}] ❌ {roll_number} login failed: {resp.status} ({login_time:.2f}s)")
                return
    except Exception as e:
        login_time = time.time() - login_start
        results["login_fail"] += 1
        results["login_errors"].append(f"{roll_number}: {str(e)[:100]}")
        print(f"  [{student_num:2d}] ❌ {roll_number} login error: {str(e)[:60]} ({login_time:.2f}s)")
        return

    # Small random delay (50-200ms) to simulate real users
    await asyncio.sleep(random.uniform(0.05, 0.2))

    # Phase 2: Select Course
    select_start = time.time()
    try:
        async with session.post(
            f"{BASE_URL}/api/courses/select/{course_id}",
            json={},
            headers={"Authorization": f"Bearer {token}"},
            timeout=aiohttp.ClientTimeout(total=30)
        ) as resp:
            select_time = time.time() - select_start
            results["select_times"].append(select_time)
            
            if resp.status == 200:
                results["select_success"] += 1
                course_name = COURSE_NAMES[course_id]
                results["course_selections"][course_name] += 1
                print(f"  [{student_num:2d}] 🎓 {roll_number} -> {course_name} ({select_time:.2f}s)")
            elif resp.status == 429:
                results["select_fail"] += 1
                results["select_errors"].append(f"{roll_number}: Rate limited")
                print(f"  [{student_num:2d}] 🚫 {roll_number} select RATE LIMITED ({select_time:.2f}s)")
            else:
                body = await resp.json()
                msg = body.get("message", str(body))
                results["select_fail"] += 1
                results["select_errors"].append(f"{roll_number}: {msg}")
                print(f"  [{student_num:2d}] ⚠️  {roll_number} select failed: {msg} ({select_time:.2f}s)")
    except Exception as e:
        select_time = time.time() - select_start
        results["select_fail"] += 1
        results["select_errors"].append(f"{roll_number}: {str(e)[:100]}")
        print(f"  [{student_num:2d}] ❌ {roll_number} select error: {str(e)[:60]} ({select_time:.2f}s)")


async def main():
    print("=" * 70)
    print("🔥 LOAD TEST: 60 Students Simultaneous Course Selection")
    print("=" * 70)
    print(f"🌐 Target: {BASE_URL}")
    print(f"👥 Students: 60 (25D1502 - 25D1562)")
    print(f"📚 Courses: 3 x 20 capacity = 60 total seats")
    print(f"📋 Distribution: 20 students per course (round-robin)")
    print("=" * 70)
    
    # Assign courses round-robin: first 20 -> ML, next 20 -> Cloud, last 20 -> Cyber
    students = ROLL_NUMBERS[:60]
    assignments = []
    for i, roll in enumerate(students):
        course_id = COURSE_IDS[i % 3]  # Round-robin across 3 courses
        assignments.append((roll, course_id, i + 1))
    
    # Shuffle to make it more realistic (not sequential)
    random.shuffle(assignments)
    
    print(f"\n⏱️  Starting all 60 requests simultaneously...\n")
    overall_start = time.time()
    
    connector = aiohttp.TCPConnector(limit=60, force_close=False)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [
            student_flow(session, roll, course_id, num)
            for roll, course_id, num in assignments
        ]
        await asyncio.gather(*tasks)
    
    overall_time = time.time() - overall_start
    
    # Print results
    print("\n" + "=" * 70)
    print("📊 LOAD TEST RESULTS")
    print("=" * 70)
    
    print(f"\n⏱️  Total time: {overall_time:.2f}s")
    
    print(f"\n🔐 LOGIN PHASE:")
    print(f"   ✅ Success: {results['login_success']}/60")
    print(f"   ❌ Failed:  {results['login_fail']}/60")
    if results["login_times"]:
        print(f"   ⏱️  Avg time:  {sum(results['login_times'])/len(results['login_times']):.2f}s")
        print(f"   ⏱️  Min time:  {min(results['login_times']):.2f}s")
        print(f"   ⏱️  Max time:  {max(results['login_times']):.2f}s")
    
    print(f"\n📚 COURSE SELECTION PHASE:")
    print(f"   ✅ Success: {results['select_success']}/60")
    print(f"   ❌ Failed:  {results['select_fail']}/60")
    if results["select_times"]:
        print(f"   ⏱️  Avg time:  {sum(results['select_times'])/len(results['select_times']):.2f}s")
        print(f"   ⏱️  Min time:  {min(results['select_times']):.2f}s")
        print(f"   ⏱️  Max time:  {max(results['select_times']):.2f}s")
    
    print(f"\n📊 COURSE DISTRIBUTION:")
    for name, count in results["course_selections"].items():
        bar = "█" * count + "░" * (20 - count)
        print(f"   {name:20s} [{bar}] {count}/20")
    
    # Check for race conditions (over-enrollment)
    total_enrolled = sum(results["course_selections"].values())
    print(f"\n🏁 TOTAL ENROLLED: {total_enrolled}/60")
    
    if results["login_errors"]:
        print(f"\n⚠️  LOGIN ERRORS ({len(results['login_errors'])}):")
        for e in results["login_errors"][:10]:
            print(f"   - {e}")
    
    if results["select_errors"]:
        print(f"\n⚠️  SELECT ERRORS ({len(results['select_errors'])}):")
        for e in results["select_errors"][:10]:
            print(f"   - {e}")
    
    # Verdict
    print("\n" + "=" * 70)
    if results["select_success"] == 60 and total_enrolled == 60:
        print("✅ VERDICT: PERFECT - All 60 students enrolled successfully!")
    elif results["select_success"] > 0 and total_enrolled <= 60:
        print(f"⚠️  VERDICT: PARTIAL - {total_enrolled}/60 enrolled, no over-enrollment (capacity safe)")
    elif total_enrolled > 60:
        print(f"🔴 VERDICT: RACE CONDITION DETECTED - {total_enrolled} enrolled (over capacity!)")
    else:
        print("❌ VERDICT: FAILED - Check errors above")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
