package in.yapp.Service;


import in.yapp.DTO.LoginResponseDTO;
import in.yapp.Security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class JwtService
{

    private final JwtEncoder jwtEncoder;


    public LoginResponseDTO generateToken(CustomUserDetails userDetails)
    {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(60 * 60);

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(userDetails.getUserId().toString())
                .claim("username",userDetails.getUsername())
                .claim("role",userDetails.getAuthorities().iterator().next().getAuthority())
                .issuedAt(now)
                .expiresAt(now.plusSeconds(60*60))
                .build();

        String token =  jwtEncoder
                .encode(JwtEncoderParameters.from(claims))
                .getTokenValue();


        long expiresIn = expiresAt.getEpochSecond() - now.getEpochSecond();

        return new LoginResponseDTO(
                token,
                expiresIn
        );

    }
    
}
