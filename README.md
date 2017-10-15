# Проект

Скрипт для вознаграждения упомянутых авторов в посте. Пока только можно выплатить процент полученных за пост золотых всем в равной доли.

## Настройка

В корне находится пример конфигурационного файла config.json.example. Переименуйте его в config.json и отредактируйте.

* golos_node - нода golos wss://ws.golos.io, по умолчанию установлена нода от @vik (меньеш косяков)
* userid - имя аккаунта на голосе, от имени которого будут выплачиваться вознаграждения
* key" - приватный активный ключ. Начинается с 5...
* voter_reward_percent - процент от золотых полученных за пост
* memo - текст для заметки в переводе. Будет дополнен линком на пост. Можно добавить параметр '{rating_post}' который будет заменен ан ссылку на пост. 
* bypass - список пользователей которые будут проигнорированы и останутся без выплат

## Подготовка к работе
1. Устанавливаем docker и запускаем
2. заходим в папку с проектом
```
cd PATH_TO_PROJECT
```
3. выполняем комманду 
```
docker run -it --rm --name my-running-script -v PATH_TO_PROJECT:/usr/src/app -w /usr/src/app node:8 bash -c "npm install"
```

## Запуск сприпта
есть два варианта запуска
- демо режим - выводит общую информацию, после при нажатии на клавишу происходит вывод данных суммах перевода кажому пользователю, БЕЗ ПЕРЕВОДА
```
docker run -it --rm --name my-running-script -v PATH_TO_PROJECT:/usr/src/app -w /usr/src/app node:8 bash -c "node index.js permlink=12-10-2017-gmt-luchshie-stati-za-den-reiting-statei-na-osnove-reputacii-po-tegam"
```
После 'permlink=' подставляем пермлинку на свой пост
- боевой режим - выводит общую информацию, 10 сикунд на отмену нажатием любой клавиши, и последующая выплата и отображение информации по выплате каждому пользователю
```
docker run -it --rm --name my-running-script -v PATH_TO_PROJECT:/usr/src/app -w /usr/src/app node:8 bash -c "node index.js permlink=12-10-2017-gmt-luchshie-stati-za-den-reiting-statei-na-osnove-reputacii-po-tegam broadcast"
```
После 'permlink=' подставляем пермлинку на свой пост.
Команда как в демо режиме + приписка "broadcast" в конце


P/S
за основу взят [скрипт](https://golos.io/ru--golos/@ropox/otkat-skript) от @ropox  и переработан









