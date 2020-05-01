import React, { Component } from 'react'
//bootstrap
import { Toast } from 'react-bootstrap';

//scroll to bottom
import ScrollToBottom from 'react-scroll-to-bottom';
//react-redux
import { connect } from 'react-redux';

//end point 
import { ENDPOINT } from '../../endpoint/endpoint';
//socket io
import io from 'socket.io-client';
import TypingMessage from '../TypingMessage';

//switch button
import Switch from '@material-ui/core/Switch';

//encryption
import NodeRSA from 'node-rsa';



let socket;


class FeedMessage extends Component {
    constructor(props) {
        super(props);


        if (localStorage.getItem('neoCookie') == null) {
            this.props.history.push('/');

        }
        else {
            this.props.setName(JSON.parse(localStorage.getItem('neoCookie')).UserName);
            this.props.setRoom(localStorage.getItem('ROOMKEY'));
        }

        this.state =
        {

            //UserName: queryString.parse(props.location.search).name,
            // Room: queryString.parse(props.location.search).room,
            myCookie: JSON.parse(localStorage.getItem('neoCookie')),
            UserName: this.props.User.UserName,
            Receiver: localStorage.getItem('RECIEVERID'),//this is for storing receivers id
            Room: this.props.Roomkey,
            gotMessages: [],
            sendMessage: '',
            typing: [],
            MemberList: [],
            secureCheck: false, //used this to establish secure coonnection
            ReciverSecureCheck: false, //used this to establish secure coonnection
            key: new NodeRSA({ b: 512 }),
            privateKey: null,
            publicKey: null,
            ReciverPublicKey: null,
            CypherText: '',
            PlainText: '',



        }
        socket = io(ENDPOINT);
    }
    // component did mount function
    //in here im going to connect to a socket
    componentDidMount() {
        if (localStorage.getItem('neoCookie') != null) {
            this.setState({

                privateKey: new NodeRSA(this.state.key.exportKey('private')),
                publicKey: new NodeRSA(this.state.key.exportKey('public')),

            });

            console.log(this.state.UserName);
            socket.emit('join', { id: this.state.myCookie.id, UserName: this.state.UserName, Room: this.state.Room }, () => {
                alert("ERROR");

            })


            socket.on('message',
                (getMessage) => {
                    if (this.state.secureCheck == true && this.state.ReciverSecureCheck == true) {
                        if (getMessage.User != this.state.UserName) {
                            this.setState({ PlainText: this.state.privateKey.decrypt(getMessage.Text, 'utf8') }, () => {
                                
                                this.setState({
                                    gotMessages: [...this.state.gotMessages, 
                                        {
                                            User: getMessage.User,
                                            Text: this.state.PlainText,
                                            User1: getMessage.User1,
                                            User2: getMessage.User2
                                        }
                                    ]
                                });
                            });
                        }
                        

                    }
                    else {
                        this.setState({
                            gotMessages: [...this.state.gotMessages, getMessage]
                        },
                        );
                    }

                }


            );
            socket.on('sendtyping',
                (getProps) => {
                    if (getProps.User != this.state.UserName) {
                        console.log('typing recived');
                        this.setState({ typing: getProps });
                    }
                }


            );
            socket.on('sendMemberList',
                (getProps) => {
                    this.setState({ MemberList: getProps });
                    console.log('got memberlist ' + JSON.stringify(this.state.MemberList));
                }


            );
            //setting secure ServerSendPublicKey
            socket.on('ServerSendPublicKey',
                (getProps) => {



                    if (getProps.User != this.state.UserName) {
                        console.log('key recived =>' + getProps.Key);
                        this.setState({ ReciverPublicKey: new NodeRSA(getProps.Key), ReciverSecureCheck: getProps.Checked });
                    }

                }


            );


        }
        else {
            this.props.history.push('/');
        }


    }
    sendButtonPressed = () => {

        if (this.state.secureCheck == true && this.state.ReciverSecureCheck == true) {
            this.setState({ CypherText: this.state.ReciverPublicKey.encrypt(this.state.sendMessage, 'base64') },
                () => {
                    console.log(this.state.CypherText);
                    console.log(this.state.gotMessages);
                    socket.emit('sendMessage', {
                        User: this.state.UserName,
                        Text: this.state.CypherText,
                        User1: this.state.myCookie.id,
                        User2: this.state.Receiver
                    }
                        , () => {
                            alert("ERROR");
                            this.props.history.push('/online')
                        });
                    this.setState({
                        gotMessages: [...this.state.gotMessages, {
                            User: this.state.UserName,
                            Text: this.state.sendMessage,
                            User1: this.state.myCookie.id,
                            User2: this.state.Receiver
                        }]
                    });
                    this.setState({
                        sendMessage: '',
                        CypherText: ''
                    });
                    socket.emit('typing', { User: this.state.UserName, Typing: false }, () => {
                        alert("ERROR");
                        this.props.history.push('/online')
                    });
                }

            );

        }
        else {
            console.log(this.state.gotMessages);
            socket.emit('sendMessage', {
                User: this.state.UserName,
                Text: this.state.sendMessage,
                User1: this.state.myCookie.id,
                User2: this.state.Receiver
            }
                , () => {
                    alert("ERROR");
                    this.props.history.push('/online')
                });
            this.setState({
                sendMessage: ''
            });
            socket.emit('typing', { User: this.state.UserName, Typing: false }, () => {
                alert("ERROR");
                this.props.history.push('/online')
            });

        }


    }
    textAreacChanged = (e) => {
        if (e.target.value != '') {
            console.log('typing');
            socket.emit('typing', { User: this.state.UserName, Typing: true }, () => {
                alert("ERROR");
                this.props.history.push('/online')
            });


        }
        else if (e.target.value == '') {
            socket.emit('typing', { User: this.state.UserName, Typing: false }, () => {
                alert("ERROR");
                this.props.history.push('/online')
            });
        }
        this.setState({
            sendMessage: e.target.value
        }

        );

    }
    setToggleChat = () => {


        socket.emit('disconnect');
        socket.off();

        this.props.messageCallback(this.state.Room);
        localStorage.removeItem('ROOMKEY');

    }
    SetSecure = (e) => {
        console.log('sending key =>' + this.state.publicKey);
        this.setState(
            {
                secureCheck: e.target.checked
            }
        );
        //sendPublicKey
        socket.emit('sendPublicKey', { User: this.state.UserName, Key: this.state.key.exportKey('public'), Checked: e.target.checked }, () => {
            alert("ERROR");
            this.props.history.push('/online')
        })
    }
    componentWillUnmount() {
        if (localStorage.getItem('neoCookie' != null)) {
            localStorage.removeItem('ROOMKEY');
            socket.emit('disconnect');
            socket.off();
            console.log("UNMOUNTed");

        }
    }


    render() {
        return (
            <div >
                <Toast className='tosts' show={true} onClose={this.setToggleChat} >
                    <Toast.Header>
                        <img src="holder.js/20x20?text=%20" className="rounded mr-2" alt="" />
                        <strong className="mr-auto">Receiver</strong>
                        <p>secure <Switch checked={this.state.secureCheck} onChange={this.SetSecure} />
                            <Switch disabled checked={this.state.ReciverSecureCheck} />
                        </p>

                    </Toast.Header>
                    <Toast.Body>
                        <div className="popUpMessage">
                            <ScrollToBottom className='popUpMessage'>
                                <p>some text: some text</p>
                                {
                                    this.state.gotMessages.map(item => <p>{item.User}=>{item.Text}</p>)
                                }
                            </ScrollToBottom>
                        </div>
                        <input type='text' value={this.state.sendMessage} onChange={this.textAreacChanged}
                            placeholder="Type your message..." />
                        <button onClick={this.sendButtonPressed}>send</button>
                    </Toast.Body>
                </Toast>

            </div>
        );
    }
}
const mapStateToProps = (state) => {
    return (
        {
            Math: state.MathReducer,
            User: state.UserReducer

        }
    );
};
const mapDispatchToProps = (dispatch) => {
    // ... normally is an object full of action creators
    return (
        {
            setName: (props) => {
                dispatch({
                    type: 'SET_NAME',
                    payload: props
                });
            },
            setRoom: (props) => {
                dispatch(
                    {
                        type: "SET_ROOM",
                        payload: props
                    }
                );
            },
            setChat: () => {
                dispatch(
                    {
                        type: "SET_CHAT_OPEN"
                    }
                );
            }

        }
    );
};

export default connect(mapStateToProps, mapDispatchToProps)(FeedMessage);