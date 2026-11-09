#!/usr/bin/env python3
"""
FitGlass AI - Selector de Proveedor de Inteligencia Artificial (Gemini / OpenAI GPT)
Uso:
    python switch_ai.py             -> Muestra el estado actual
    python switch_ai.py gemini      -> Cambia a Google Gemini
    python switch_ai.py openai      -> Cambia a OpenAI (gpt-4o-mini)
    python switch_ai.py gpt         -> Cambia a OpenAI (gpt-4o-mini)
"""

import sys
from pathlib import Path

ENV_PATH = Path(__file__).resolve().parent / ".env"


def read_env() -> dict:
    if not ENV_PATH.exists():
        return {}
    lines = ENV_PATH.read_text(encoding="utf-8").splitlines()
    data = {}
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            k, v = line.split("=", 1)
            data[k.strip()] = v.strip()
    return data


def set_provider(target: str):
    target = target.lower().strip()
    if target in ("openai", "gpt", "gpt-4o-mini", "chatgpt"):
        provider = "openai"
    elif target in ("gemini", "google"):
        provider = "gemini"
    else:
        print(f"[-] Proveedor no reconocido: '{target}'. Usa 'gemini' o 'openai'.")
        sys.exit(1)

    if not ENV_PATH.exists():
        ENV_PATH.write_text(f"AI_PROVIDER={provider}\n", encoding="utf-8")
    else:
        content = ENV_PATH.read_text(encoding="utf-8")
        lines = content.splitlines()
        found = False
        new_lines = []
        for line in lines:
            if line.strip().startswith("AI_PROVIDER=") or line.strip().startswith("VITE_AI_PROVIDER="):
                new_lines.append(f"AI_PROVIDER={provider}")
                found = True
            else:
                new_lines.append(line)
        if not found:
            new_lines.insert(0, f"AI_PROVIDER={provider}")
        ENV_PATH.write_text("\n".join(new_lines) + "\n", encoding="utf-8")

    env = read_env()
    print(f"\n[OK] Proveedor de IA cambiado exitosamente a: [ {provider.upper()} ]")
    if provider == "openai":
        model = env.get("OPENAI_MODEL") or env.get("VITE_OPENAI_MODEL") or "gpt-4o-mini"
        has_key = bool(env.get("OPENAI_API_KEY") or env.get("VITE_OPENAI_API_KEY"))
        print(f"   Modelo: {model}")
        print(f"   API Key configurada: {'[OK] Configurada' if has_key else '[!] Falta configurar OPENAI_API_KEY en .env'}")
    else:
        model = env.get("GEMINI_MODEL", "gemini-3.1-flash-lite")
        has_key = bool(env.get("GEMINI_API_KEY"))
        print(f"   Modelo: {model}")
        print(f"   API Key configurada: {'[OK] Configurada' if has_key else '[!] Falta configurar GEMINI_API_KEY en .env'}")
    print("\nReinicia tu backend si ya estaba corriendo para aplicar los cambios.")


def show_status():
    env = read_env()
    current = env.get("AI_PROVIDER") or env.get("VITE_AI_PROVIDER") or "gemini"
    current = current.lower().strip()

    print("\n==========================================")
    print("      FITGLASS AI - ESTADO DEL PROVEEDOR   ")
    print("==========================================")
    print(f"  Proveedor activo actual: [ {current.upper()} ]")
    print("------------------------------------------")

    gemini_key = "[OK] Configurada" if env.get("GEMINI_API_KEY") else "[-] No configurada"
    openai_key = "[OK] Configurada" if (env.get("OPENAI_API_KEY") or env.get("VITE_OPENAI_API_KEY")) else "[-] No configurada"

    print(f"  * Google Gemini: {gemini_key} (Modelo: {env.get('GEMINI_MODEL', 'gemini-3.1-flash-lite')})")
    print(f"  * OpenAI (GPT):  {openai_key} (Modelo: {env.get('OPENAI_MODEL') or env.get('VITE_OPENAI_MODEL', 'gpt-4o-mini')})")
    print("==========================================\n")
    print("Comandos disponibles:")
    print("  python switch_ai.py gemini   -> Cambiar a Gemini")
    print("  python switch_ai.py openai   -> Cambiar a GPT (OpenAI)")
    print("")


def main():
    if len(sys.argv) > 1:
        set_provider(sys.argv[1])
    else:
        show_status()


if __name__ == "__main__":
    main()
