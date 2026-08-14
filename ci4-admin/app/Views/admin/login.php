<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>KFESTA 관리자 로그인</title>
<link rel="stylesheet" href="/assets/css/admin-login.css">
</head>
<body>
<div class="login-wrap">
  <form class="login-card" method="post" action="/admin/login">
    <?= csrf_field() ?>
    <h1>KFESTA 관리자</h1>
    <?php if (! empty($error)): ?>
      <p class="err"><?= esc($error) ?></p>
    <?php endif ?>
    <label>이메일
      <input type="email" name="email" required autofocus autocomplete="username">
    </label>
    <label>비밀번호
      <input type="password" name="password" required autocomplete="current-password">
    </label>
    <button type="submit">로그인</button>
  </form>
</div>
</body>
</html>
