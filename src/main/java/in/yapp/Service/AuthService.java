package in.yapp.Service;

import in.yapp.DTO.LoginRequestDTO;
import in.yapp.DTO.LoginResponseDTO;
import in.yapp.DTO.UserRegisterRequestDTO;
import in.yapp.DTO.UserRegisterResponseDTO;
import in.yapp.Entity.Role;
import in.yapp.Entity.User;
import in.yapp.Exceptions.AppException;
import in.yapp.Exceptions.ErrorCode;
import in.yapp.Repository.UserRepository;
import in.yapp.Security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import in.yapp.Entity.Conversation;
import in.yapp.Entity.Message;
import in.yapp.Entity.MessageStatus;
import in.yapp.Entity.MessageType;
import in.yapp.Repository.ConversationMemberRepository;
import in.yapp.Repository.MessageRespository;

import java.time.Instant;
import java.util.Locale;


@Service
@RequiredArgsConstructor
public class AuthService {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;


    private final ConversationService conversationService;
    private final ConversationMemberRepository conversationMemberRepository;
    private final MessageRespository messageRespository;


    //User registeration...
    public UserRegisterResponseDTO register(UserRegisterRequestDTO userRegisterRequestDTO)
    {
        // Check for existing username and email before creating the user
        String userName = userRegisterRequestDTO.getUsername().toLowerCase(Locale.ROOT);


        if(userRepository.existsByUserName(userName)) {
            throw new AppException(
                    "Username is not available",
                    ErrorCode.USERNAME_ALREADY_EXISTS
            );
        }



        // Create user
         User user = new User();


        String passwordHashed = passwordEncoder.encode(userRegisterRequestDTO.getPassword());

         user.setUserName(userRegisterRequestDTO.getUsername().toLowerCase(Locale.ROOT));

        user.setPasswordHash(passwordHashed);

        user.setDisplayName(user.getUserName());
        user.setRole(Role.USER);
        user.setEnabled(true);
        user.setOnline(false);
        user.setLastSeen(Instant.now());

        userRepository.save(user);

// Find Yapp's official account
        User shetty = userRepository
                .findByUserName("suprithshetty")
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Yapp owner account 'suprithshetty' does not exist"
                        )
                );

// Create the conversation between the new user and Shetty
        Conversation conversation =
                conversationService.findorCreateDirectConversation(
                        user,
                        shetty
                );

// Create the welcome message from Shetty
        Message welcomeMessage = new Message();

        welcomeMessage.setSender(shetty);
        welcomeMessage.setConversation(conversation);
        welcomeMessage.setContent(
                """
                Hey! Welcome to Yapp 👋
        
                I’m Suprith, and I built Yapp as a place to experiment with real-time chat and backend development.
        
                I enjoy turning ideas into things people can actually use — and I’m always up for building something interesting with the right people.
        
                If that sounds like you, let’s connect.
        
                📩 shettysuprith@gmail.com
                """
        );
        welcomeMessage.setMessageType(MessageType.TEXT);
        welcomeMessage.setCreatedAt(Instant.now());
        welcomeMessage.setStatus(MessageStatus.SENT);

        messageRespository.save(welcomeMessage);

        UserRegisterResponseDTO response = new UserRegisterResponseDTO();
        response.setUserName(user.getUserName());
        response.setMessage("User registered successfully");

        return response;

    }


    //User Login
    public LoginResponseDTO login(LoginRequestDTO request)
    {
        UsernamePasswordAuthenticationToken authenticationToken =
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                );

        Authentication authentication = authenticationManager.authenticate(authenticationToken);


        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        return jwtService.generateToken(userDetails);



    }













}
