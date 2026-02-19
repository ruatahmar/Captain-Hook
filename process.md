created subscription endpoint:

- used async verification handler for faster and safety underconcurrency

Using prisma for ORM but all querys are in raw sql to practice

- use cursor to make the fanout faster

new arch

```
api call ---> fanout worker ---> delivery worker
```
