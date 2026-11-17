FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:10000

# La imagen trae un usuario sin privilegios; sin esta línea el proceso corre como root.
USER $APP_UID

ENTRYPOINT ["dotnet", "Backend.dll"]
