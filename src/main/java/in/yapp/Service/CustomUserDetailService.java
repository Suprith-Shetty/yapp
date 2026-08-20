package in.yapp.Service;

import in.yapp.Entity.User;
import in.yapp.Exceptions.AppException;
import in.yapp.Exceptions.ErrorCode;
import in.yapp.Repository.UserRepository;
import in.yapp.Security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailService implements UserDetailsService
{

    private final UserRepository userRepository;



    @Override
    public UserDetails loadUserByUsername(String identifier)
    {


        User user = userRepository.findByUserNameOrEmail(identifier)
                                .orElseThrow(() -> new AppException(
                                        "User not found",
                                        ErrorCode.USER_NOT_FOUND
                                ));

        return new CustomUserDetails(user);

    }

}
