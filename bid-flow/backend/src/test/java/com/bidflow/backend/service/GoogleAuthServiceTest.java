package com.bidflow.backend.service;

import com.bidflow.backend.dto.AuthResponse;
import com.bidflow.backend.entity.User;
import com.bidflow.backend.enums.Role;
import com.bidflow.backend.repository.UserRepository;
import com.bidflow.backend.security.GoogleTokenVerifier;
import com.bidflow.backend.security.GoogleTokenVerifier.GoogleUser;
import com.bidflow.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// Unit test ล้วน (Mockito) — ไม่โหลด Spring context ไม่แตะ DB
// TransactionTemplate ของจริงกับ transaction manager จำลอง → ตรวจได้ว่า commit / rollback หรือไม่
@ExtendWith(MockitoExtension.class)
class GoogleAuthServiceTest {

    private static final String CREDENTIAL = "google-id-token";
    private static final String SUB = "110169484474386276334";

    @Mock private GoogleTokenVerifier verifier;
    @Mock private UserRepository userRepository;
    @Mock private JwtService jwtService;
    @Mock private PlatformTransactionManager transactionManager;

    private GoogleAuthService service;

    @BeforeEach
    void setUp() {
        service = new GoogleAuthService(verifier, userRepository, jwtService, new TransactionTemplate(transactionManager));
    }

    private void givenGoogleUser(String email, String name) {
        when(verifier.isConfigured()).thenReturn(true);
        when(verifier.verify(CREDENTIAL)).thenReturn(new GoogleUser(SUB, email, name));
    }

    private void givenSavesSucceed() {
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> {
            User user = inv.getArgument(0);
            if (user.getId() == null) {
                user.setId(99L);
            }
            return user;
        });
        when(jwtService.generateToken(any(User.class))).thenReturn("our-jwt");
    }

    private static User user(long id, String username, String email) {
        return User.builder()
                .id(id)
                .username(username)
                .email(email)
                .passwordHash("$2a$10$hash")
                .fullName("Existing User")
                .walletBalance(new BigDecimal("1234.00"))
                .build();
    }

    private ResponseStatusException loginFailsWith(HttpStatus status) {
        Throwable thrown = catchThrowable(() -> service.login(CREDENTIAL));
        assertThat(thrown).isInstanceOf(ResponseStatusException.class);
        ResponseStatusException e = (ResponseStatusException) thrown;
        assertThat(e.getStatusCode()).isEqualTo(status);
        return e;
    }

    // ---------- ปฏิเสธก่อนแตะฐานข้อมูล ----------

    @Test
    void notConfigured_returns503_withoutVerifyingOrTouchingUsers() {
        when(verifier.isConfigured()).thenReturn(false);

        loginFailsWith(HttpStatus.SERVICE_UNAVAILABLE);

        verify(verifier, never()).verify(anyString());
        verifyNoInteractions(userRepository, jwtService, transactionManager);
    }

    @Test
    void invalidToken_propagates401_withoutTouchingUsers() {
        when(verifier.isConfigured()).thenReturn(true);
        when(verifier.verify(CREDENTIAL)).thenThrow(new BadCredentialsException("Invalid Google credential"));

        assertThatThrownBy(() -> service.login(CREDENTIAL))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Invalid Google credential");
        verifyNoInteractions(userRepository, jwtService, transactionManager);
    }

    // ---------- 1. sub เดิม ----------

    @Test
    void knownGoogleSub_logsIntoThatAccount_withoutChanges() {
        givenGoogleUser("new-address@gmail.com", "Some One");
        User existing = user(5, "someone", "old-address@example.com");
        existing.setGoogleSub(SUB);
        when(userRepository.findByGoogleSub(SUB)).thenReturn(Optional.of(existing));
        when(jwtService.generateToken(existing)).thenReturn("our-jwt");

        AuthResponse response = service.login(CREDENTIAL);

        assertThat(response.token()).isEqualTo("our-jwt");
        assertThat(response.userId()).isEqualTo(5L);
        assertThat(response.email()).isEqualTo("old-address@example.com");   // ไม่เปลี่ยนอีเมลตาม Google
        verify(userRepository, never()).findByEmailIgnoreCase(anyString());
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void knownGoogleSub_suspended_returns403_withoutToken() {
        givenGoogleUser("someone@gmail.com", "Some One");
        User suspended = user(5, "someone", "someone@gmail.com");
        suspended.setGoogleSub(SUB);
        suspended.setSuspended(true);
        when(userRepository.findByGoogleSub(SUB)).thenReturn(Optional.of(suspended));

        assertThat(loginFailsWith(HttpStatus.FORBIDDEN).getReason()).isEqualTo("Account suspended");
        verifyNoInteractions(jwtService);
    }

    // ---------- 2. เชื่อมด้วยอีเมล ----------

    @Test
    void matchingEmail_linksGoogleToExistingAccount_keepingPasswordAndWallet() {
        givenGoogleUser("Bob@Gmail.com", "Bob Google");
        givenSavesSucceed();
        User bob = user(2, "bob", "bob@gmail.com");
        when(userRepository.findByGoogleSub(SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("Bob@Gmail.com")).thenReturn(List.of(bob));

        AuthResponse response = service.login(CREDENTIAL);

        assertThat(response.userId()).isEqualTo(2L);
        assertThat(response.username()).isEqualTo("bob");
        assertThat(bob.getGoogleSub()).isEqualTo(SUB);
        assertThat(bob.getPasswordHash()).isEqualTo("$2a$10$hash");        // ยังใช้รหัสผ่านเดิมได้
        assertThat(bob.getWalletBalance()).isEqualByComparingTo("1234.00"); // ไม่ได้โบนัสซ้ำ
        assertThat(bob.getFullName()).isEqualTo("Existing User");           // ไม่ทับชื่อเดิม
        verify(userRepository).saveAndFlush(bob);
        verify(userRepository, never()).existsByUsername(anyString());
    }

    @Test
    void matchingEmail_suspended_returns403_andDoesNotLink() {
        givenGoogleUser("bob@gmail.com", "Bob");
        User bob = user(2, "bob", "bob@gmail.com");
        bob.setSuspended(true);
        when(userRepository.findByGoogleSub(SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("bob@gmail.com")).thenReturn(List.of(bob));

        loginFailsWith(HttpStatus.FORBIDDEN);

        assertThat(bob.getGoogleSub()).isNull();
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void matchingEmail_alreadyLinkedToAnotherGoogleAccount_returns409_andRollsBack() {
        givenGoogleUser("bob@gmail.com", "Bob");
        User bob = user(2, "bob", "bob@gmail.com");
        bob.setGoogleSub("another-google-sub");
        when(userRepository.findByGoogleSub(SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("bob@gmail.com")).thenReturn(List.of(bob));

        assertThat(loginFailsWith(HttpStatus.CONFLICT).getReason())
                .isEqualTo("This email is already linked to a different Google account");

        assertThat(bob.getGoogleSub()).isEqualTo("another-google-sub");
        verify(userRepository, never()).saveAndFlush(any());
        verify(transactionManager).rollback(any());
        verify(transactionManager, never()).commit(any());
        verifyNoInteractions(jwtService);
    }

    @Test
    void severalAccountsWithSameEmail_prefersExactMatch() {
        givenGoogleUser("bob@gmail.com", "Bob");
        givenSavesSucceed();
        User upper = user(3, "bob_upper", "Bob@gmail.com");
        User exact = user(2, "bob", "bob@gmail.com");
        when(userRepository.findByGoogleSub(SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("bob@gmail.com")).thenReturn(List.of(upper, exact));

        assertThat(service.login(CREDENTIAL).userId()).isEqualTo(2L);
        assertThat(exact.getGoogleSub()).isEqualTo(SUB);
        assertThat(upper.getGoogleSub()).isNull();
    }

    @Test
    void severalAccountsWithSameEmail_noExactMatch_returns409_insteadOfGuessing() {
        givenGoogleUser("bob@gmail.com", "Bob");
        when(userRepository.findByGoogleSub(SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("bob@gmail.com"))
                .thenReturn(List.of(user(2, "bob1", "BOB@gmail.com"), user(3, "bob2", "Bob@gmail.com")));

        loginFailsWith(HttpStatus.CONFLICT);
        verify(userRepository, never()).saveAndFlush(any());
    }

    // ---------- 3. ผู้ใช้ใหม่ ----------

    @Test
    void newGoogleUser_createsAccountWithoutPassword_andWelcomeBalance() {
        givenGoogleUser("John.Doe+bids@gmail.com", "John Doe");
        givenSavesSucceed();
        when(userRepository.findByGoogleSub(SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(List.of());
        when(userRepository.existsByUsername("john_doe_bids")).thenReturn(false);

        AuthResponse response = service.login(CREDENTIAL);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(saved.capture());
        User created = saved.getValue();
        assertThat(created.getUsername()).isEqualTo("john_doe_bids");
        assertThat(created.getEmail()).isEqualTo("John.Doe+bids@gmail.com");
        assertThat(created.getFullName()).isEqualTo("John Doe");
        assertThat(created.getPasswordHash()).isNull();
        assertThat(created.getWalletBalance()).isEqualByComparingTo("10000.00");
        assertThat(created.getRole()).isEqualTo(Role.USER);
        assertThat(created.isSuspended()).isFalse();
        assertThat(created.getGoogleSub()).isEqualTo(SUB);

        assertThat(response.token()).isEqualTo("our-jwt");
        assertThat(response.userId()).isEqualTo(99L);
        assertThat(response.username()).isEqualTo("john_doe_bids");
        verify(transactionManager).commit(any());
    }

    @Test
    void newGoogleUser_usernameTaken_appendsNextFreeNumber() {
        givenGoogleUser("alice@gmail.com", "Alice");
        givenSavesSucceed();
        when(userRepository.findByGoogleSub(SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(List.of());
        when(userRepository.existsByUsername("alice")).thenReturn(true);
        when(userRepository.existsByUsername("alice_2")).thenReturn(true);
        when(userRepository.existsByUsername("alice_3")).thenReturn(false);

        assertThat(service.login(CREDENTIAL).username()).isEqualTo("alice_3");
    }

    @Test
    void newGoogleUser_withoutName_usesUsernameAsFullName() {
        givenGoogleUser("carol@gmail.com", null);
        givenSavesSucceed();
        when(userRepository.findByGoogleSub(SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(List.of());
        when(userRepository.existsByUsername("carol")).thenReturn(false);

        assertThat(service.login(CREDENTIAL).fullName()).isEqualTo("carol");
    }

    @Test
    void newGoogleUser_emailLongerThanColumn_returns400() {
        String longEmail = "a".repeat(95) + "@gmail.com";
        givenGoogleUser(longEmail, "Long");
        when(userRepository.findByGoogleSub(SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase(longEmail)).thenReturn(List.of());

        loginFailsWith(HttpStatus.BAD_REQUEST);
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void usernameBase_followsDesignRules() {
        assertThat(GoogleAuthService.usernameBase("Somchai.J@gmail.com")).isEqualTo("somchai_j");
        assertThat(GoogleAuthService.usernameBase("ab@gmail.com")).isEqualTo("ab_user");          // สั้นกว่า 3
        assertThat(GoogleAuthService.usernameBase("müller@gmail.com")).isEqualTo("m_ller");        // ไม่ใช่ a-z
        assertThat(GoogleAuthService.usernameBase("x".repeat(64) + "@gmail.com")).hasSize(40);   // ยาวเกิน 40
        assertThat(GoogleAuthService.usernameBase("under_score9@gmail.com")).isEqualTo("under_score9");
    }

    // ---------- request ซ้อนกันตอนสร้างบัญชีครั้งแรก ----------

    @Test
    void uniqueConstraintRace_retriesOnce_andUsesAccountCreatedByOtherRequest() {
        givenGoogleUser("dave@gmail.com", "Dave");
        User createdByOtherRequest = user(7, "dave", "dave@gmail.com");
        createdByOtherRequest.setGoogleSub(SUB);
        when(userRepository.findByGoogleSub(SUB))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(createdByOtherRequest));
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(List.of());
        when(userRepository.existsByUsername("dave")).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key users_google_sub_key"));
        when(jwtService.generateToken(createdByOtherRequest)).thenReturn("our-jwt");

        AuthResponse response = service.login(CREDENTIAL);

        assertThat(response.userId()).isEqualTo(7L);
        verify(userRepository, times(2)).findByGoogleSub(SUB);
        verify(transactionManager).rollback(any());   // ครั้งแรก rollback
        verify(transactionManager).commit(any());     // ครั้งที่สอง commit
    }

    @Test
    void uniqueConstraintRace_twice_returns409() {
        givenGoogleUser("erin@gmail.com", "Erin");
        when(userRepository.findByGoogleSub(SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(List.of());
        when(userRepository.existsByUsername("erin")).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key"));

        loginFailsWith(HttpStatus.CONFLICT);
        verify(userRepository, times(2)).saveAndFlush(any(User.class));
        verifyNoInteractions(jwtService);
    }
}
