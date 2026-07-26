# Nythera V5

Neu:
- Kill-Ticket Button öffnet Modal
- Kill-Ticket wird gespeichert und zur Prüfung gepostet
- Management kann annehmen/ablehnen
- `/eventtest name:<Event>` sendet sofort ein Test-Event
- Event-Scheduler verwendet ein robustes Zwei-Minuten-Fenster
- Panel UUID-Fix aus V4 bleibt erhalten

Nach Deploy:
1. Im Event-Channel `/setup typ: Events`
2. Im Kill-Ticket-Channel `/setup typ: Kill-Tickets`
3. `/eventtest name:50er`
4. Kill-Ticket Button testen
