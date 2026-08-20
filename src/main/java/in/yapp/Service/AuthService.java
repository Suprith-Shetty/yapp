package in.yapp.Service;

import in.yapp.DTO.LoginRequestDTO;
import in.yapp.DTO.UserRegisterRequestDTO;
import in.yapp.DTO.UserRegisterResponseDTO;
import in.yapp.Entity.Role;
import in.yapp.Entity.User;
import in.yapp.Exceptions.AppException;
import in.yapp.Exceptions.ErrorCode;
import in.yapp.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;


@Service
@RequiredArgsConstructor
public class AuthService {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;

    //User registeration...
    public UserRegisterResponseDTO register(UserRegisterRequestDTO userRegisterRequestDTO)
    {
        // Check for existing username and email before creating the user
        String userName = userRegisterRequestDTO.getUsername().toLowerCase(Locale.ROOT);
        String email = userRegisterRequestDTO.getEmail().toLowerCase(Locale.ROOT);


        if(userRepository.existsByUserName(userName)) {
            throw new AppException(
                    "Username is not available",
                    ErrorCode.USERNAME_ALREADY_EXISTS
            );
        }

        if(userRepository.existsByEmail(email))
        {
            throw new AppException(
                    "Email is not available",
                    ErrorCode.EMAIL_ALREADY_EXISTS
            );

        }


        // Create user
         User user = new User();


        String passwordHashed = passwordEncoder.encode(userRegisterRequestDTO.getPassword());

         user.setUserName(userRegisterRequestDTO.getUsername().toLowerCase(Locale.ROOT));



        user.setEmail(userRegisterRequestDTO.getEmail().toLowerCase(Locale.ROOT));
        user.setPasswordHash(passwordHashed);

        user.setDisplayName(user.getUserName());
        user.setRole(Role.USER);
        user.setEnabled(true);

        userRepository.save(user);

        UserRegisterResponseDTO response = new UserRegisterResponseDTO();
        response.setUserName(user.getUserName());
        response.setMessage("User registered successfully");

        return response;

    }


    //User Login
    public void login(LoginRequestDTO request)
    {
        UsernamePasswordAuthenticationToken authenticationToken =
                new UsernamePasswordAuthenticationToken(
                        request.getIdentifier(),
                        request.getPassword()
                );

        authenticationManager.authenticate(authenticationToken);
    }













}
