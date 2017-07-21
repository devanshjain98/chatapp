var express = require('express');

var cool = require('cool-ascii-faces');
app.get('/cool', function(request, response) {
    response.send(cool());
});
var app = express()
    , http = require('http')
    , server = http.createServer(app)
    , io = require('socket.io').listen(server);

server.listen(9000);

// routing
app.use('/',express.static('public_static'));

// usernames which are currently connected to the chat
var usernames = {};

// rooms which are currently available in chat
var rooms = ['room1','room2','room3'];
var roomusers = [];
for(var i=0;i<rooms.length;i++)
{
    roomusers[i]=[];
    roomusers[i].push(rooms[i])
}






io.sockets.on('connection', function (socket) {

    // when the client emits 'adduser', this listens and executes
    socket.on('adduser', function(username){
        // store the username in the socket session for this client
        socket.username = username;
        // store the room name in the socket session for this client
        socket.room = 'room1';
        // add the client's username to the global list
        usernames[username] = username;
        // send client to room 1
        socket.join('room1');
        // echo to client they've connected
        socket.emit('updatechat', 'SERVER', 'you have connected to room1');
        // echo to room 1 that a person has connected to their room
        socket.emit('firstuser',username);
        socket.broadcast.to('room1').emit('updatechat', 'SERVER', username + ' has connected to this room');
        socket.emit('updaterooms', rooms, 'room1');
        roomusers[0].push(socket.username);
        socket.emit('updateroomusers',roomusers[0]);



    });





    // when the client emits 'sendchat', this listens and executes
    socket.on('sendchat', function (data) {
        // we tell the client to execute 'updatechat' with 2 parameters
        io.sockets.in(socket.room).emit('updatechat', socket.username, data);
    });

    socket.on('createroom', function (newroom) {

        rooms.push(newroom);
        // leave the current room (stored in session)
        roomusers.push([newroom]);
        for(var i=0;i<rooms.length;i++)
        {
            if (roomusers[i][0] == socket.room)
            {
                var index = roomusers[i].indexOf(socket.username)
                roomusers[i].splice(index, 1);
            }

        }
        socket.leave(socket.room);
        // join new room, received as function parameter
        socket.join(newroom);
        roomusers[((roomusers.length)-1)].push(socket.username)
        socket.emit('updatechat', 'SERVER', 'you have connected to '+ newroom);
        // sent message to OLD room
        socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username+' has left this room and created a new room: '+newroom+' . Please Join another room to see the newly created room');
        // update socket session room title
        socket.room = newroom;
        socket.broadcast.to(newroom).emit('updatechat', 'SERVER', socket.username+' has joined this room');


        socket.emit('updaterooms', rooms, newroom);
        socket.emit('updateroomusers',roomusers[((roomusers.length)-1)]);
        console.log(roomusers[((roomusers.length)-1)]);

    });

    socket.on('switchRoom', function(newroom){
        var newroomindex;
        // leave the current room (stored in session)
        socket.leave(socket.room);
        // join new room, received as function parameter
        for(var i=0;i<rooms.length;i++)
        {
            if (roomusers[i][0] == socket.room)
            {
                var index = roomusers[i].indexOf(socket.username)
                roomusers[i].splice(index, 1);
            }

        }
        socket.join(newroom);
        for(var i=0;i<rooms.length;i++)
        {
            if (roomusers[i][0] == newroom)
            {

                roomusers[i].push(socket.username);
                newroomindex = i;
            }

        }
        socket.emit('updatechat', 'SERVER', 'you have connected to '+ newroom);
        // sent message to OLD room
        socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username+' has left this room');
        // update socket session room title
        socket.room = newroom;
        socket.broadcast.to(newroom).emit('updatechat', 'SERVER', socket.username+' has joined this room');
        socket.emit('updaterooms', rooms, newroom);
        io.emit('updaterooms', rooms, newroom);
        socket.emit('updateroomusers',roomusers[newroomindex]);
        console.log(roomusers[newroomindex]);
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function(){
        var oldroomindex;
        // remove the username from global usernames list
        delete usernames[socket.username];
        for(var i=0;i<rooms.length;i++)
        {
            if (roomusers[i][0] == socket.room)
            {
                var index = roomusers[i].indexOf(socket.username)
                roomusers[i].splice(index, 1);
                oldroomindex = i;
            }

        }
        // update list of users in chat, client-side
        io.sockets.emit('updateusers', usernames);
        // echo globally that this client has left
        socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
        socket.leave(socket.room);
        socket.emit('updateroomusers',roomusers[oldroomindex]);

    });



/*/!**!/// loop through clients in ‘room1′ and add their usernames to the roomusers array
    for(var i = 0; i < clients.length; i++) {
        roomusers[roomusers.length] = clients[i].username;
    }*/
// broadcast to everyone in room 1 the usernames of the clients connected.
    io.emit('updateallusers',usernames);


});