"""X運用ダッシュボード — FastAPI backend."""

import csv
import io
import json
import os
import re
import shutil
import socket
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv

import anthropic
import uvicorn
import yaml
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path.home() / "X運用"
CONFIG_PATH = Path(__file__).parent / "config.json"

# Load X API credentials
load_dotenv(Path.home() / "xmcp" / ".env")
X_BEARER_TOKEN = os.getenv("X_BEARER_TOKEN", "")

CHARACTERS = {
    "けんた": {"mcp_port": 8000, "label": "けんた"},
    "ともこ": {"mcp_port": 8001, "label": "ともこ"},
}

SETTING_FILES = {
    "profile": "キャラ設定/profile.md",
    "brand-voice": "キャラ設定/brand-voice.md",
    "ng-words": "キャラ設定/ng-words.md",
    "dm-template": "キャラ設定/dm-template.md",
}

STATUS_CYCLE = ["ストック", "使用済み", "投稿済み"]

app = FastAPI()

# --- helpers ---

def _load_config() -> dict:
    if CONFIG_PATH.exists():
        return json.loads(CONFIG_PATH.read_text())
    return {}


def _save_config(data: dict):
    CONFIG_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2))


def _stock_dir(char: str) -> Path:
    return BASE_DIR / char / "アウトプット" / "X投稿" / "ストック"


def _parse_post(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    meta = {"type": "", "date": "", "status": "ストック"}
    body = text
    m = re.match(r"^---\n(.+?)\n---\n?(.*)", text, re.DOTALL)
    if m:
        try:
            meta.update(yaml.safe_load(m.group(1)) or {})
        except yaml.YAMLError:
            pass
        body = m.group(2).strip()
    meta["date"] = str(meta.get("date", ""))
    return {"filename": path.name, "meta": meta, "body": body}


def _write_post(path: Path, meta: dict, body: str):
    fm = yaml.dump(meta, allow_unicode=True, default_flow_style=False).strip()
    path.write_text(f"---\n{fm}\n---\n\n{body}\n", encoding="utf-8")


def _check_port(port: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=1):
            return True
    except (ConnectionRefusedError, OSError):
        return False


def _images_dir(char: str) -> Path:
    return BASE_DIR / char / "アウトプット" / "X投稿" / "画像"


def _validate_char(char: str):
    if char not in CHARACTERS:
        raise HTTPException(404, f"Character not found: {char}")


# --- API routes ---

@app.get("/api/characters")
def list_characters():
    result = []
    for name, info in CHARACTERS.items():
        d = _stock_dir(name)
        count = len(list(d.glob("*.md"))) if d.exists() else 0
        result.append({"name": name, "label": info["label"], "count": count})
    return result


@app.get("/api/posts/{char}")
def list_posts(char: str, filter: str = ""):
    _validate_char(char)
    d = _stock_dir(char)
    if not d.exists():
        return []
    posts = []
    for f in sorted(d.glob("*.md"), reverse=True):
        p = _parse_post(f)
        if filter and filter != "すべて" and p["meta"].get("status") != filter:
            continue
        posts.append(p)
    return posts


@app.get("/api/posts/{char}/{filename}")
def get_post(char: str, filename: str):
    _validate_char(char)
    path = _stock_dir(char) / filename
    if not path.exists():
        raise HTTPException(404, "Post not found")
    return _parse_post(path)


class PostUpdate(BaseModel):
    body: str

@app.put("/api/posts/{char}/{filename}")
def update_post(char: str, filename: str, data: PostUpdate):
    _validate_char(char)
    path = _stock_dir(char) / filename
    if not path.exists():
        raise HTTPException(404, "Post not found")
    post = _parse_post(path)
    _write_post(path, post["meta"], data.body)
    return {"ok": True}


@app.put("/api/posts/{char}/{filename}/status")
def cycle_status(char: str, filename: str):
    _validate_char(char)
    path = _stock_dir(char) / filename
    if not path.exists():
        raise HTTPException(404, "Post not found")
    post = _parse_post(path)
    current = post["meta"].get("status", "ストック")
    idx = STATUS_CYCLE.index(current) if current in STATUS_CYCLE else -1
    new_status = STATUS_CYCLE[(idx + 1) % len(STATUS_CYCLE)]
    post["meta"]["status"] = new_status
    _write_post(path, post["meta"], post["body"])
    return {"status": new_status}


@app.get("/api/settings/{char}")
def list_settings(char: str):
    _validate_char(char)
    result = []
    for key, rel_path in SETTING_FILES.items():
        full = BASE_DIR / char / rel_path
        result.append({"key": key, "exists": full.exists()})
    return result


@app.get("/api/settings/{char}/{name}")
def get_setting(char: str, name: str):
    _validate_char(char)
    rel = SETTING_FILES.get(name)
    if not rel:
        raise HTTPException(404, "Setting not found")
    path = BASE_DIR / char / rel
    if not path.exists():
        return {"key": name, "content": ""}
    return {"key": name, "content": path.read_text(encoding="utf-8")}


class SettingUpdate(BaseModel):
    content: str

@app.put("/api/settings/{char}/{name}")
def update_setting(char: str, name: str, data: SettingUpdate):
    _validate_char(char)
    rel = SETTING_FILES.get(name)
    if not rel:
        raise HTTPException(404, "Setting not found")
    path = BASE_DIR / char / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(data.content, encoding="utf-8")
    return {"ok": True}


@app.get("/api/config")
def get_config():
    cfg = _load_config()
    has_key = bool(cfg.get("anthropic_api_key"))
    return {"has_api_key": has_key}


class ConfigUpdate(BaseModel):
    anthropic_api_key: str

@app.put("/api/config")
def update_config(data: ConfigUpdate):
    cfg = _load_config()
    cfg["anthropic_api_key"] = data.anthropic_api_key
    _save_config(cfg)
    return {"ok": True}


@app.get("/api/mcp-status")
def mcp_status():
    result = {}
    for name, info in CHARACTERS.items():
        result[name] = _check_port(info["mcp_port"])
    return result


# --- Image API ---

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

@app.get("/api/images/{char}")
def list_images(char: str):
    _validate_char(char)
    d = _images_dir(char)
    d.mkdir(parents=True, exist_ok=True)
    return [f.name for f in sorted(d.iterdir()) if f.suffix.lower() in IMAGE_EXTS]


@app.post("/api/images/{char}")
async def upload_image(char: str, file: UploadFile = File(...)):
    _validate_char(char)
    d = _images_dir(char)
    d.mkdir(parents=True, exist_ok=True)
    if Path(file.filename).suffix.lower() not in IMAGE_EXTS:
        raise HTTPException(400, "画像ファイル (jpg/png/gif/webp) のみ対応")
    dest = d / file.filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"filename": file.filename}


@app.delete("/api/images/{char}/{filename}")
def delete_image(char: str, filename: str):
    _validate_char(char)
    path = _images_dir(char) / filename
    if path.exists():
        path.unlink()
    return {"ok": True}


@app.get("/api/images/{char}/{filename}/file")
def serve_image(char: str, filename: str):
    _validate_char(char)
    path = _images_dir(char) / filename
    if not path.exists():
        raise HTTPException(404, "Image not found")
    return FileResponse(path)


class ImageAttach(BaseModel):
    images: list[str]

@app.put("/api/posts/{char}/{filename}/images")
def attach_images(char: str, filename: str, data: ImageAttach):
    _validate_char(char)
    path = _stock_dir(char) / filename
    if not path.exists():
        raise HTTPException(404, "Post not found")
    post = _parse_post(path)
    post["meta"]["images"] = data.images[:4]
    _write_post(path, post["meta"], post["body"])
    return {"ok": True, "images": post["meta"]["images"]}


# --- SocialDog Export API ---

class ExportRequest(BaseModel):
    character: str
    start_date: str  # YYYY-MM-DD
    time_slots: list[str] = ["07:00", "12:00", "19:00"]
    filter_status: str = "ストック"

@app.post("/api/export/socialdog")
def export_socialdog(req: ExportRequest):
    _validate_char(req.character)
    d = _stock_dir(req.character)
    if not d.exists():
        raise HTTPException(404, "No posts found")

    posts = []
    for f in sorted(d.glob("*.md")):
        p = _parse_post(f)
        if p["meta"].get("status") == req.filter_status:
            posts.append(p)

    if not posts:
        raise HTTPException(400, "対象の投稿がありません")

    start = datetime.strptime(req.start_date, "%Y-%m-%d")
    slots = req.time_slots if req.time_slots else ["07:00", "12:00", "19:00"]
    slots_per_day = len(slots)

    output = io.StringIO()
    output.write("\ufeff")  # UTF-8 BOM for Excel
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)

    for i, post in enumerate(posts):
        day_offset = i // slots_per_day
        slot_idx = i % slots_per_day
        post_dt = start + timedelta(days=day_offset)
        time_str = slots[slot_idx]
        dt_str = f"{post_dt.strftime('%Y/%m/%d')} {time_str}"

        images = post["meta"].get("images", [])
        row = [dt_str, post["body"]] + images[:4]
        writer.writerow(row)

    output.seek(0)
    char_label = CHARACTERS[req.character]["label"]
    fname = f"socialdog_{char_label}_{req.start_date}.csv"
    from urllib.parse import quote
    encoded_fname = quote(fname)
    return StreamingResponse(
        output,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_fname}",
        },
    )


@app.post("/api/export/socialdog/preview")
def export_preview(req: ExportRequest):
    _validate_char(req.character)
    d = _stock_dir(req.character)
    count = 0
    if d.exists():
        for f in d.glob("*.md"):
            p = _parse_post(f)
            if p["meta"].get("status") == req.filter_status:
                count += 1
    slots_per_day = len(req.time_slots) if req.time_slots else 3
    days = (count + slots_per_day - 1) // slots_per_day if count else 0
    return {"count": count, "days": days, "slots_per_day": slots_per_day}


class GenerateRequest(BaseModel):
    character: str
    mode: str  # "weekly" or "single"
    post_type: str = ""  # A/B/C/D (for single)
    theme: str = ""  # optional theme

@app.post("/api/generate")
def generate_posts(req: GenerateRequest):
    _validate_char(req.character)
    cfg = _load_config()
    api_key = cfg.get("anthropic_api_key")
    if not api_key:
        raise HTTPException(400, "APIキーが未設定です")

    char_dir = BASE_DIR / req.character
    profile = (char_dir / "キャラ設定/profile.md").read_text(encoding="utf-8") if (char_dir / "キャラ設定/profile.md").exists() else ""
    voice = (char_dir / "キャラ設定/brand-voice.md").read_text(encoding="utf-8") if (char_dir / "キャラ設定/brand-voice.md").exists() else ""
    ng = (char_dir / "キャラ設定/ng-words.md").read_text(encoding="utf-8") if (char_dir / "キャラ設定/ng-words.md").exists() else ""
    claude_md = (char_dir / "CLAUDE.md").read_text(encoding="utf-8") if (char_dir / "CLAUDE.md").exists() else ""

    today = date.today().isoformat()

    if req.mode == "weekly":
        plan = [
            ("A", 7), ("B", 5), ("C", 5), ("D", 4),
        ]
        schedule_note = (
            "7日間に割り当て: Day1=A,B,C / Day2=A,B,C / Day3=A,B,C / "
            "Day4=A,B,D / Day5=A,C,D / Day6=A,B,C / Day7=A,D,D"
        )
        prompt = f"""あなたは以下のキャラクターとしてX投稿を書くコピーライターです。

## 指示書
{claude_md}

## プロフィール
{profile}

## 口調・文体ルール（厳守）
{voice}

## NG表現（厳守）
{ng}

## タスク
今日は{today}です。
週次21本の投稿を生成してください。

内訳: A(日常・共感)×7, B(ノウハウ)×5, C(ストーリー)×5, D(導線)×4
{schedule_note}

## 出力フォーマット（厳守）
各投稿を以下の形式で出力してください。投稿間は「===」で区切ります。

---
type: A
date: {today}
status: ストック
---

（投稿本文）

===

---
type: B
date: {today}
status: ストック
---

（投稿本文）

===

（以下21本分続ける）

注意:
- 必ず21本出力すること
- 「===」で投稿を区切ること
- frontmatterの形式を崩さないこと
- dateは7日間に分散させること（{today}起点）"""
    else:
        prompt = f"""あなたは以下のキャラクターとしてX投稿を書くコピーライターです。

## 指示書
{claude_md}

## プロフィール
{profile}

## 口調・文体ルール（厳守）
{voice}

## NG表現（厳守）
{ng}

## タスク
今日は{today}です。
Type {req.post_type} の投稿を1本生成してください。
{"テーマ: " + req.theme if req.theme else ""}

## 出力フォーマット（厳守）

---
type: {req.post_type}
date: {today}
status: ストック
---

（投稿本文）"""

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8000,
        messages=[{"role": "user", "content": prompt}],
    )
    response_text = message.content[0].text

    # Parse posts from response
    raw_posts = re.split(r"\n===\n", response_text)
    saved = []
    stock_dir = _stock_dir(req.character)
    stock_dir.mkdir(parents=True, exist_ok=True)

    existing = {f.name for f in stock_dir.glob("*.md")}

    for raw in raw_posts:
        raw = raw.strip()
        if not raw:
            continue
        m = re.match(r"^---\n(.+?)\n---\n?(.*)", raw, re.DOTALL)
        if not m:
            continue
        try:
            meta = yaml.safe_load(m.group(1)) or {}
        except yaml.YAMLError:
            continue
        body = m.group(2).strip()
        post_date = str(meta.get("date", today))
        post_type = meta.get("type", "A")
        meta["status"] = "ストック"
        meta["date"] = post_date

        # Find next available filename
        for seq in range(1, 100):
            fname = f"{post_date}_{post_type}_{seq:02d}.md"
            if fname not in existing:
                break
        existing.add(fname)
        path = stock_dir / fname
        _write_post(path, meta, body)
        saved.append(fname)

    return {"saved": saved, "count": len(saved)}


# --- Research helpers ---

def _research_dir(char: str) -> Path:
    return BASE_DIR / char / "収集"


def _load_research_posts(char: str) -> list[dict]:
    p = _research_dir(char) / "posts.json"
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return []


def _save_research_posts(char: str, posts: list[dict]):
    d = _research_dir(char)
    d.mkdir(parents=True, exist_ok=True)
    (d / "posts.json").write_text(
        json.dumps(posts, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _load_research_queries(char: str) -> list[dict]:
    p = _research_dir(char) / "queries.json"
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return []


def _save_research_queries(char: str, queries: list[dict]):
    d = _research_dir(char)
    d.mkdir(parents=True, exist_ok=True)
    (d / "queries.json").write_text(
        json.dumps(queries, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _fmt(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}K"
    return str(n)


# --- Research API: Search ---

class SearchRequest(BaseModel):
    query: str
    max_results: int = 20


@app.post("/api/research/{char}/search")
async def search_tweets(char: str, req: SearchRequest):
    _validate_char(char)
    if not X_BEARER_TOKEN:
        raise HTTPException(400, "X_BEARER_TOKEN が未設定です（~/xmcp/.env）")

    params = {
        "query": req.query,
        "max_results": max(10, min(req.max_results, 100)),
        "tweet.fields": "created_at,public_metrics,author_id,lang",
        "expansions": "author_id",
        "user.fields": "username,name",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.x.com/2/tweets/search/recent",
            params=params,
            headers={"Authorization": f"Bearer {X_BEARER_TOKEN}"},
            timeout=15,
        )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"X API error: {resp.text[:300]}")

    data = resp.json()
    tweets = data.get("data", [])
    users = {u["id"]: u for u in data.get("includes", {}).get("users", [])}

    results = []
    for t in tweets:
        m = t.get("public_metrics", {})
        author = users.get(t.get("author_id"), {})
        results.append({
            "tweet_id": t["id"],
            "author_username": author.get("username", ""),
            "author_name": author.get("name", ""),
            "text": t.get("text", ""),
            "impressions": m.get("impression_count", 0),
            "likes": m.get("like_count", 0),
            "retweets": m.get("retweet_count", 0),
            "replies": m.get("reply_count", 0),
            "bookmarks": m.get("bookmark_count", 0),
            "tweet_created_at": t.get("created_at", ""),
            "tweet_url": f"https://x.com/{author.get('username', '_')}/status/{t['id']}",
        })
    return {"results": results, "count": len(results)}


# --- Research API: Collected Posts ---

@app.get("/api/research/{char}/posts")
def list_research_posts(char: str, status: str = ""):
    _validate_char(char)
    posts = _load_research_posts(char)
    if status:
        posts = [p for p in posts if p.get("status") == status]
    posts.sort(key=lambda p: p.get("likes", 0), reverse=True)
    return {"posts": posts, "count": len(posts)}


class CollectRequest(BaseModel):
    posts: list[dict]


@app.post("/api/research/{char}/posts")
def collect_posts(char: str, req: CollectRequest):
    _validate_char(char)
    existing = _load_research_posts(char)
    existing_ids = {p["tweet_id"] for p in existing}
    added = 0
    now = datetime.now().isoformat()
    for p in req.posts:
        if p.get("tweet_id") and p["tweet_id"] not in existing_ids:
            p["status"] = "collected"
            p["notes"] = ""
            p["collected_at"] = now
            existing.append(p)
            existing_ids.add(p["tweet_id"])
            added += 1
    _save_research_posts(char, existing)
    return {"added": added, "total": len(existing)}


class PostUpdateResearch(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


@app.put("/api/research/{char}/posts/{tweet_id}")
def update_research_post(char: str, tweet_id: str, data: PostUpdateResearch):
    _validate_char(char)
    posts = _load_research_posts(char)
    for p in posts:
        if p["tweet_id"] == tweet_id:
            if data.status is not None:
                p["status"] = data.status
            if data.notes is not None:
                p["notes"] = data.notes
            _save_research_posts(char, posts)
            return {"ok": True}
    raise HTTPException(404, "Post not found")


@app.delete("/api/research/{char}/posts/{tweet_id}")
def delete_research_post(char: str, tweet_id: str):
    _validate_char(char)
    posts = _load_research_posts(char)
    posts = [p for p in posts if p["tweet_id"] != tweet_id]
    _save_research_posts(char, posts)
    return {"ok": True}


# --- Research API: Saved Queries ---

@app.get("/api/research/{char}/queries")
def list_research_queries(char: str):
    _validate_char(char)
    return _load_research_queries(char)


class QuerySave(BaseModel):
    name: str
    query: str


@app.post("/api/research/{char}/queries")
def save_research_query(char: str, req: QuerySave):
    _validate_char(char)
    queries = _load_research_queries(char)
    queries.append({"name": req.name, "query": req.query, "saved_at": datetime.now().isoformat()})
    _save_research_queries(char, queries)
    return {"ok": True}


class QueryDelete(BaseModel):
    index: int


@app.post("/api/research/{char}/queries/delete")
def delete_research_query(char: str, req: QueryDelete):
    _validate_char(char)
    queries = _load_research_queries(char)
    if 0 <= req.index < len(queries):
        queries.pop(req.index)
        _save_research_queries(char, queries)
    return {"ok": True}


# --- Research API: Analyze ---

@app.post("/api/research/{char}/analyze")
def analyze_posts(char: str):
    _validate_char(char)
    cfg = _load_config()
    api_key = cfg.get("anthropic_api_key")
    if not api_key:
        raise HTTPException(400, "APIキーが未設定です")

    posts = _load_research_posts(char)
    if not posts:
        raise HTTPException(400, "収集済みポストがありません")

    # Build post summary for analysis
    top = sorted(posts, key=lambda p: p.get("likes", 0), reverse=True)[:30]
    summary = "\n\n---\n\n".join(
        f"@{p.get('author_username','')} | ♥{_fmt(p.get('likes',0))} RT{_fmt(p.get('retweets',0))} Imp{_fmt(p.get('impressions',0))}\n{p.get('text','')}"
        for p in top
    )

    char_dir = BASE_DIR / char
    profile = ""
    profile_path = char_dir / "キャラ設定" / "profile.md"
    if profile_path.exists():
        profile = profile_path.read_text(encoding="utf-8")

    prompt = f"""以下は、Xで収集したバズ投稿（いいね数順トップ30）です。

## 収集ポスト
{summary}

## キャラクタープロフィール
{profile}

## 分析タスク
上記のバズ投稿を分析し、以下をMarkdown形式で出力してください:

1. **フックパターン分析**: 冒頭1行目の型を3-5パターンに分類（例: 数字型、疑問型、衝撃事実型…）。各パターンの平均エンゲージメントと代表例を示す
2. **テーマ分析**: どのテーマ（日常、ノウハウ、ストーリー、数字実績）が伸びやすいか
3. **構造分析**: 伸びるポストの文章構造パターン（改行の使い方、長さ、CTA位置）
4. **このキャラへの提案**: 上記分析を踏まえ、このキャラクターの口調・設定で再現可能な投稿パターンを3つ提案（各パターンのテンプレート付き）

簡潔に、データに基づいて分析してください。"""

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )
    return {"analysis": message.content[0].text, "post_count": len(top)}


# Static files & SPA fallback
app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")

@app.get("/")
def index():
    return FileResponse(Path(__file__).parent / "static" / "index.html")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=3000)
