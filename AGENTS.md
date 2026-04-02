blue-technologies/AGENTS.md
# AGENTS.md – Wytyczne dla agentów AI pracujących nad projektem MyOS-like service

---

## Czym jest Blue Language?

**Blue Language** to uniwersalny język opisu danych i kontraktów, który pozwala na:
- Jednoznaczne typowanie każdego bytu (każdy typ ma swój unikalny BlueId)
- Dziedziczenie i rozszerzanie typów
- Opisywanie instancji oraz reguł ich przetwarzania (kontrakty)
- Współpracę ludzi, AI i usług bez centralnego serwera

---

## Jak agent powinien rozumieć byty w Blue?

### 1. Typy (Types)
- Każdy typ (np. Person, Invoice, Order) ma swój opis oraz BlueId (hash treści).
- Typy mogą być przekazywane agentowi jako pełna definicja lub jako BlueId.

**Przykład typu:**
```yaml
name: Person
age:
  type: Integer
spent:
  amount:
    type: Double
  currency:
    type: Text
```

**Przykład referencji przez BlueId:**
```json
{
  "type": {
    "blueId": "6E93TBwTYYZ3zaWQhryCWz4rnJgGisaDgPrU8RnVLWuC"
  }
}
```

### 2. Instancje (Instances)
- Instancja to konkretny byt danego typu, np. osoba o imieniu Alice.

**Przykład instancji:**
```json
{
  "name": "Alice",
  "type": {
    "blueId": "6E93TBwTYYZ3zaWQhryCWz4rnJgGisaDgPrU8RnVLWuC"
  },
  "age": 25,
  "spent": {
    "amount": 27.15,
    "currency": "USD"
  }
}
```

### 3. BlueId
- BlueId to unikalny identyfikator treści (hash), który pozwala agentowi jednoznacznie rozpoznać typ lub instancję.
- Agent powinien traktować BlueId jako główne źródło prawdy o znaczeniu bytu.

---

## Jak agent powinien obsługiwać byty Blue?

- **Rozpoznawanie typu po BlueId:** Jeśli otrzymasz BlueId, pobierz definicję typu z repo.blue lub lokalnego cache.
- **Walidacja instancji:** Sprawdź, czy instancja jest zgodna z typem (np. czy pola i typy się zgadzają).
- **Tworzenie nowych bytów:** Twórz nowe instancje zgodnie z definicją typu.
- **Przetwarzanie kontraktów:** Jeśli byt zawiera sekcję contracts, agent może uruchamiać workflowy lub reagować na zdarzenia zgodnie z regułami Blue.

---

## Przykładowy workflow dla agenta

1. Odbierz wsad (payload) z informacją o bycie (typ lub instancja).
2. Jeśli wsad zawiera BlueId typu:
   - Pobierz definicję typu (jeśli nie masz jej lokalnie).
3. Jeśli wsad zawiera pełną definicję typu:
   - Zarejestruj typ lokalnie (opcjonalnie oblicz BlueId).
4. Jeśli wsad zawiera instancję:
   - Zweryfikuj zgodność z typem.
   - Przetwarzaj zgodnie z kontraktami (jeśli są).
5. Zwróć wynik lub podejmij akcję (np. wyświetl, edytuj, przekaż dalej).

---

## Przykładowe wsady do testów

**Typ:**
```json
{
  "type": {
    "name": "Person",
    "age": { "type": "Integer" },
    "spent": {
      "amount": { "type": "Double" },
      "currency": { "type": "Text" }
    }
  }
}
```

**Instancja:**
```json
{
  "name": "Alice",
  "type": {
    "blueId": "6E93TBwTYYZ3zaWQhryCWz4rnJgGisaDgPrU8RnVLWuC"
  },
  "age": 25,
  "spent": {
    "amount": 27.15,
    "currency": "USD"
  }
}
```

---

## Dobre praktyki

- Zawsze korzystaj z BlueId do identyfikacji typów i instancji.
- Jeśli agent nie zna typu po BlueId, pobierz go z repozytorium lub poproś użytkownika o definicję.
- Waliduj dane przed dalszym przetwarzaniem.
- Wspieraj dziedziczenie i rozszerzanie typów (jeśli agent to umożliwia).
- Dokumentuj obsługiwane typy i kontrakty w pliku README lub AGENTS.md.

---

## Cel projektu
Stworzenie minimalnej usługi webowej (MyOS-like service) oraz lekkiego dashboardu, zgodnie z wymaganiami rekrutacyjnymi Blue Language Labs. Kluczowym wymaganiem jest deterministyczne przetwarzanie Document Sessions.

---

## Kluczowe pojęcia

- **Blue Document**: Dokument wejściowy, zawierający definicje kanałów (channels) powiązanych z timeline’ami.
- **Timeline**: Strumień zdarzeń (append-only event stream), przypisany do użytkownika.
- **Timeline Entry**: Pojedyncze zdarzenie zapisane w timeline.
- **Document Session**: Instancja przetwarzania Blue Document, identyfikowana przez sessionId, deterministycznie przetwarzająca timeline’y i wpisy.
- **Deterministyczność**: Każda Document Session, przy tych samych danych wejściowych, musi zawsze osiągać ten sam stan końcowy.

---

## Wytyczne dla agentów AI

1. **Zachowuj minimalizm i czytelność kodu** – preferuj proste, zrozumiałe rozwiązania.
2. **Gwarantuj deterministyczność** – unikaj race conditions, przetwarzaj wpisy w ustalonej kolejności, zapewnij powtarzalność wyników.
3. **Stosuj się do TODO.md** – realizuj zadania zgodnie z listą kroków i etapów.
4. **Dokumentuj decyzje architektoniczne** – każda nietrywialna decyzja powinna być opisana w dokumentacji.
5. **Testuj integracyjnie** – każda kluczowa ścieżka użytkownika powinna być pokryta testami integracyjnymi.
6. **Zachowuj zgodność z formatami Blue Language/MyOS** – struktury danych muszą być zgodne z dokumentacją Blue Language Labs.
7. **Dbaj o bezpieczeństwo** – szczególnie w zakresie autoryzacji i uprawnień użytkowników.
8. **Dashboard ma być lekki** – UI powinno być proste, funkcjonalne, bez zbędnych ozdobników.
9. **Nie usuwaj kodu bez konsultacji** – jeśli napotkasz problem, preferuj debugowanie i logowanie zamiast usuwania funkcjonalności.
10. **Zachowuj spójność stylu kodu** – stosuj jednolity styl w całym projekcie.

---

## Odnośniki do dokumentacji

- Blue Language introduction: https://language.blue/docs/language/introduction
- MyOS 101 course: https://developers.myos.blue/docs/tutorials/myos-101/

---

## Kontakt i wsparcie

W przypadku niejasności, nie zakładaj rozwiązań – zadawaj pytania lub zostawiaj komentarze w kodzie.

---